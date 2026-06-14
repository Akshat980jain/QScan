package com.qrvault.app.ui.screens

import android.content.ContentValues
import android.graphics.Bitmap
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.qrvault.app.data.model.*
import com.qrvault.app.data.repository.QRCodeRepository
import com.qrvault.app.data.repository.AuthRepository
import com.qrvault.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GeneratorScreen(
    isLoggedIn: Boolean,
    onSignInClick: () -> Unit
) {
    val context = LocalContext.current
    val qrRepository = remember { QRCodeRepository(context) }
    val authRepository = remember { AuthRepository(context) }
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()
    
    var selectedType by remember { mutableStateOf(QRCodeType.TEXT) }
    var content by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("") }
    var qrBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var isGenerating by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }
    var showSaveDialog by remember { mutableStateOf(false) }
    var snackbarMessage by remember { mutableStateOf<String?>(null) }
    
    // QR Code customization
    var foregroundColor by remember { mutableStateOf(Color.Black) }
    var backgroundColor by remember { mutableStateOf(Color.White) }
    var foregroundHex by remember { mutableStateOf("#000000") }
    var backgroundHex by remember { mutableStateOf("#FFFFFF") }
    var qrSize by remember { mutableStateOf(512) } // Default size 512 for better rendering details
    
    var eyeStyle by remember { mutableStateOf("square") } // square, circle, rounded
    var patternStyle by remember { mutableStateOf("square") } // square, dot, line
    var isGradient by remember { mutableStateOf(false) }
    var gradientStart by remember { mutableStateOf(Color(0xFFF97316)) } // Orange
    var gradientEnd by remember { mutableStateOf(Color(0xFFEA580C)) }
    var gradientStartHex by remember { mutableStateOf("#F97316") }
    var gradientEndHex by remember { mutableStateOf("#EA580C") }
    
    var isDynamic by remember { mutableStateOf(false) }
    var selectedWorkspaceId by remember { mutableStateOf<String?>(null) }
    var selectedWorkspaceName by remember { mutableStateOf("Personal Space") }
    var workspacesList by remember { mutableStateOf<List<Workspace>>(emptyList()) }
    
    // Fetch workspaces and user default styles on login
    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) {
            authRepository.getCurrentUser().onSuccess { user ->
                user.defaultQRColor?.let { colorHex ->
                    try {
                        foregroundColor = Color(android.graphics.Color.parseColor(colorHex))
                        foregroundHex = colorHex
                    } catch (e: Exception) {}
                }
                user.defaultQRBgColor?.let { bgHex ->
                    try {
                        backgroundColor = Color(android.graphics.Color.parseColor(bgHex))
                        backgroundHex = bgHex
                    } catch (e: Exception) {}
                }
                user.defaultQREyeStyle?.let { style ->
                    eyeStyle = style
                }
                user.defaultQRPatternStyle?.let { pattern ->
                    patternStyle = pattern
                }
            }
            
            qrRepository.getWorkspaces().onSuccess {
                workspacesList = it
            }
        }
    }

    // Preset color palettes
    val colorPresets = listOf(
        Pair(Color.Black, Color.White),
        Pair(Color(0xFF1E40AF), Color(0xFFEFF6FF)), // Blue
        Pair(Color(0xFF047857), Color(0xFFECFDF5)), // Green
        Pair(Color(0xFF6D28D9), Color(0xFFF5F3FF)), // Purple
        Pair(Color(0xFFC2410C), Color(0xFFFFF7ED)), // Orange
        Pair(Color(0xFFB91C1C), Color(0xFFFEF2F2))  // Red
    )
    
    // WiFi specific fields
    var wifiSsid by remember { mutableStateOf("") }
    var wifiPassword by remember { mutableStateOf("") }
    var wifiEncryption by remember { mutableStateOf("WPA") }
    
    // vCard fields
    var vcardName by remember { mutableStateOf("") }
    var vcardPhone by remember { mutableStateOf("") }
    var vcardEmail by remember { mutableStateOf("") }
    var vcardOrg by remember { mutableStateOf("") }
    
    // Email fields
    var emailAddress by remember { mutableStateOf("") }
    var emailSubject by remember { mutableStateOf("") }
    var emailBody by remember { mutableStateOf("") }
    
    fun generateContent(): String {
        return when (selectedType) {
            QRCodeType.TEXT -> content
            QRCodeType.URL -> if (content.startsWith("http")) content else "https://$content"
            QRCodeType.EMAIL -> "mailto:$emailAddress?subject=$emailSubject&body=$emailBody"
            QRCodeType.PHONE -> "tel:$content"
            QRCodeType.SMS -> "sms:$content"
            QRCodeType.WIFI -> "WIFI:T:$wifiEncryption;S:$wifiSsid;P:$wifiPassword;;"
            QRCodeType.VCARD -> """
                BEGIN:VCARD
                VERSION:3.0
                N:$vcardName
                TEL:$vcardPhone
                EMAIL:$vcardEmail
                ORG:$vcardOrg
                END:VCARD
            """.trimIndent()
            QRCodeType.LOCATION -> content
        }
    }
    
    fun generateQRCode() {
        val qrContent = generateContent()
        if (qrContent.isBlank()) return
        
        isGenerating = true
        scope.launch {
            qrBitmap = withContext(Dispatchers.Default) {
                try {
                    val hints = hashMapOf<EncodeHintType, Any>()
                    hints[EncodeHintType.MARGIN] = 0 // Draw custom margin ourselves
                    hints[EncodeHintType.CHARACTER_SET] = "UTF-8"
                    
                    val writer = QRCodeWriter()
                    // Encode to the smallest natural matrix dimension first (natural modules)
                    val bitMatrix = writer.encode(qrContent, BarcodeFormat.QR_CODE, 0, 0, hints)
                    
                    val count = bitMatrix.width
                    val size = qrSize
                    val cellSize = size.toFloat() / count
                    
                    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
                    val canvas = android.graphics.Canvas(bitmap)
                    val paint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        style = android.graphics.Paint.Style.FILL
                    }
                    
                    // Draw background
                    paint.color = backgroundColor.toArgb()
                    canvas.drawRect(0f, 0f, size.toFloat(), size.toFloat(), paint)
                    
                    // Setup foreground paint
                    val fgPaint = android.graphics.Paint().apply {
                        isAntiAlias = true
                        style = android.graphics.Paint.Style.FILL
                        color = foregroundColor.toArgb()
                    }
                    
                    if (isGradient) {
                        val shader = android.graphics.LinearGradient(
                            0f, 0f, size.toFloat(), size.toFloat(),
                            gradientStart.toArgb(), gradientEnd.toArgb(),
                            android.graphics.Shader.TileMode.CLAMP
                        )
                        fgPaint.shader = shader
                    }
                    
                    // Eye Zones helper
                    fun isEyeZone(r: Int, c: Int): Boolean {
                        if (r < 7 && c < 7) return true
                        if (r < 7 && c >= count - 7) return true
                        if (r >= count - 7 && c < 7) return true
                        return false
                    }
                    
                    // Draw modules
                    for (r in 0 until count) {
                        for (c in 0 until count) {
                            if (bitMatrix[c, r]) { // ZXing matrix uses [x,y] coordinates
                                if (eyeStyle != "square" && isEyeZone(r, c)) {
                                    continue
                                }
                                
                                val x = c * cellSize
                                val y = r * cellSize
                                
                                when (patternStyle) {
                                    "dot" -> {
                                        canvas.drawCircle(x + cellSize / 2f, y + cellSize / 2f, cellSize * 0.4f, fgPaint)
                                    }
                                    "line" -> {
                                        val rect = android.graphics.RectF(x + 0.5f, y + 0.5f, x + cellSize - 0.5f, y + cellSize - 0.5f)
                                        canvas.drawRoundRect(rect, cellSize * 0.25f, cellSize * 0.25f, fgPaint)
                                    }
                                    else -> {
                                        // Square blocks
                                        canvas.drawRect(x, y, x + cellSize, y + cellSize, fgPaint)
                                    }
                                }
                            }
                        }
                    }
                    
                    // Draw custom eyes
                    if (eyeStyle != "square") {
                        val eyes = listOf(
                            Pair(0, 0),
                            Pair(0, count - 7),
                            Pair(count - 7, 0)
                        )
                        
                        val strokePaint = android.graphics.Paint().apply {
                            isAntiAlias = true
                            style = android.graphics.Paint.Style.STROKE
                            strokeWidth = cellSize
                            color = foregroundColor.toArgb()
                        }
                        
                        val eyeFillPaint = android.graphics.Paint().apply {
                            isAntiAlias = true
                            style = android.graphics.Paint.Style.FILL
                            color = foregroundColor.toArgb()
                        }
                        
                        if (isGradient) {
                            val shader = android.graphics.LinearGradient(
                                0f, 0f, size.toFloat(), size.toFloat(),
                                gradientStart.toArgb(), gradientEnd.toArgb(),
                                android.graphics.Shader.TileMode.CLAMP
                            )
                            strokePaint.shader = shader
                            eyeFillPaint.shader = shader
                        }
                        
                        for (eye in eyes) {
                            val ex = eye.second * cellSize
                            val ey = eye.first * cellSize
                            val w = 7 * cellSize
                            
                            if (eyeStyle == "circle") {
                                // Outer circle
                                canvas.drawCircle(ex + w / 2f, ey + w / 2f, w / 2f - cellSize / 2f, strokePaint)
                                // Inner circle
                                canvas.drawCircle(ex + w / 2f, ey + w / 2f, cellSize * 1.5f, eyeFillPaint)
                            } else if (eyeStyle == "rounded") {
                                // Outer rounded rect
                                val outerRect = android.graphics.RectF(ex + cellSize / 2f, ey + cellSize / 2f, ex + w - cellSize / 2f, ey + w - cellSize / 2f)
                                canvas.drawRoundRect(outerRect, cellSize * 1.6f, cellSize * 1.6f, strokePaint)
                                // Inner rounded rect
                                val innerRect = android.graphics.RectF(ex + cellSize * 2f, ey + cellSize * 2f, ex + cellSize * 5f, ey + cellSize * 5f)
                                canvas.drawRoundRect(innerRect, cellSize * 0.8f, cellSize * 0.8f, eyeFillPaint)
                            }
                        }
                    }
                    
                    bitmap
                } catch (e: Exception) {
                    android.util.Log.e("GeneratorScreen", "Local render failed", e)
                    null
                }
            }
            isGenerating = false
        }
    }
    
    fun downloadQRCode() {
        val currentBitmap = qrBitmap
        if (currentBitmap == null) {
            Toast.makeText(context, "Please generate a QR code first", Toast.LENGTH_SHORT).show()
            return
        }
        
        scope.launch {
            val success = withContext(Dispatchers.IO) {
                try {
                    val filename = "QRCode_${System.currentTimeMillis()}.png"
                    val contentValues = ContentValues().apply {
                        put(MediaStore.Images.Media.DISPLAY_NAME, filename)
                        put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/QRVault")
                            put(MediaStore.Images.Media.IS_PENDING, 1)
                        }
                    }
                    
                    val uri = context.contentResolver.insert(
                        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                        contentValues
                    )
                    
                    uri?.let { imageUri ->
                        context.contentResolver.openOutputStream(imageUri)?.use { outputStream ->
                            currentBitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
                        }
                        
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            contentValues.clear()
                            contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
                            context.contentResolver.update(imageUri, contentValues, null, null)
                        }
                        true
                    } ?: false
                } catch (e: Exception) {
                    android.util.Log.e("GeneratorScreen", "Download failed", e)
                    false
                }
            }
            
            if (success) {
                Toast.makeText(context, "QR Code saved to Pictures/QRVault", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(context, "Failed to save QR code", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    fun saveQRCode() {
        if (!isLoggedIn) {
            onSignInClick()
            return
        }
        
        if (title.isBlank()) {
            showSaveDialog = true
            return
        }
        
        val currentBitmap = qrBitmap
        if (currentBitmap == null) {
            snackbarMessage = "Please generate a QR code first"
            return
        }
        
        isSaving = true
        scope.launch {
            // Convert bitmap to Base64
            val imageBase64 = withContext(Dispatchers.Default) {
                try {
                    val byteArrayOutputStream = java.io.ByteArrayOutputStream()
                    currentBitmap.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream)
                    val byteArray = byteArrayOutputStream.toByteArray()
                    "data:image/png;base64," + android.util.Base64.encodeToString(byteArray, android.util.Base64.NO_WRAP)
                } catch (e: Exception) {
                    null
                }
            }
            
            if (imageBase64 == null) {
                isSaving = false
                snackbarMessage = "Failed to encode QR code image"
                return@launch
            }
            
            // Map vcard to contact for backend compatibility
            val backendType = when (selectedType) {
                QRCodeType.VCARD -> "contact"
                QRCodeType.LOCATION -> "text"
                else -> selectedType.value
            }
            
            val request = QRCodeRequest(
                name = title,
                content = generateContent(),
                type = backendType,
                image = imageBase64,
                size = qrSize,
                foregroundColor = String.format("#%06X", 0xFFFFFF and (if (isGradient) gradientStart.toArgb() else foregroundColor.toArgb())),
                backgroundColor = String.format("#%06X", 0xFFFFFF and backgroundColor.toArgb()),
                isDynamic = isDynamic && selectedType == QRCodeType.URL,
                targetUrl = if (isDynamic && selectedType == QRCodeType.URL) generateContent() else null,
                workspaceId = selectedWorkspaceId,
                customization = QRCodeCustomization(
                    foregroundColor = String.format("#%06X", 0xFFFFFF and (if (isGradient) gradientStart.toArgb() else foregroundColor.toArgb())),
                    backgroundColor = String.format("#%06X", 0xFFFFFF and backgroundColor.toArgb()),
                    eyeStyle = eyeStyle,
                    patternStyle = patternStyle
                )
            )
            
            val result = qrRepository.createQRCode(request)
            isSaving = false
            
            result.fold(
                onSuccess = {
                    snackbarMessage = "QR Code saved successfully!"
                    title = ""
                },
                onFailure = { error ->
                    snackbarMessage = error.message ?: "Failed to save QR code"
                }
            )
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                    colors = listOf(Orange50, White, Orange100.copy(alpha = 0.5f))
                )
            )
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        // Title
        Text(
            text = "Generate QR Code",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = Gray800
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "Create customized QR codes for any content type",
            style = MaterialTheme.typography.bodyMedium,
            color = Gray600
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // QR Type Selection
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = White),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Text(
                    text = "Content Type",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Gray800
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Type chips in rows
                QRCodeType.values().toList().chunked(4).forEach { rowTypes ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        rowTypes.forEach { type ->
                            FilterChip(
                                selected = selectedType == type,
                                onClick = { selectedType = type },
                                label = { Text(type.displayName) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Orange600,
                                    selectedLabelColor = White
                                ),
                                modifier = Modifier.weight(1f)
                            )
                        }
                        repeat(4 - rowTypes.size) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Content Input Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = White),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Text(
                    text = "Content",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Gray800
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                when (selectedType) {
                    QRCodeType.TEXT, QRCodeType.URL, QRCodeType.PHONE, QRCodeType.SMS, QRCodeType.LOCATION -> {
                        OutlinedTextField(
                            value = content,
                            onValueChange = { content = it },
                            label = { Text(getPlaceholder(selectedType)) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(
                                keyboardType = when (selectedType) {
                                    QRCodeType.URL -> KeyboardType.Uri
                                    QRCodeType.PHONE, QRCodeType.SMS -> KeyboardType.Phone
                                    else -> KeyboardType.Text
                                }
                            )
                        )
                    }
                    
                    QRCodeType.EMAIL -> {
                        OutlinedTextField(
                            value = emailAddress,
                            onValueChange = { emailAddress = it },
                            label = { Text("Email Address") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = emailSubject,
                            onValueChange = { emailSubject = it },
                            label = { Text("Subject") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = emailBody,
                            onValueChange = { emailBody = it },
                            label = { Text("Message Body") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 3,
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                    
                    QRCodeType.WIFI -> {
                        OutlinedTextField(
                            value = wifiSsid,
                            onValueChange = { wifiSsid = it },
                            label = { Text("Network Name (SSID)") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = wifiPassword,
                            onValueChange = { wifiPassword = it },
                            label = { Text("Password") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Encryption:", color = Gray600)
                            Spacer(modifier = Modifier.width(8.dp))
                            listOf("WPA", "WEP", "None").forEach { enc ->
                                FilterChip(
                                    selected = wifiEncryption == enc,
                                    onClick = { wifiEncryption = enc },
                                    label = { Text(enc) },
                                    modifier = Modifier.padding(end = 8.dp)
                                )
                            }
                        }
                    }
                    
                    QRCodeType.VCARD -> {
                        OutlinedTextField(
                            value = vcardName,
                            onValueChange = { vcardName = it },
                            label = { Text("Full Name") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = vcardPhone,
                            onValueChange = { vcardPhone = it },
                            label = { Text("Phone Number") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = vcardEmail,
                            onValueChange = { vcardEmail = it },
                            label = { Text("Email") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = vcardOrg,
                            onValueChange = { vcardOrg = it },
                            label = { Text("Organization") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Custom styling and dynamic link settings Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = White),
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Text(
                    text = "Visual Styling & Settings",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Gray800
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Dynamic link redirection switch
                if (selectedType == QRCodeType.URL) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Orange50.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Dynamic Redirect Link",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = Gray800
                            )
                            Text(
                                text = "Redirects through server to track scans & update URL later",
                                style = MaterialTheme.typography.labelSmall,
                                color = Gray500
                            )
                        }
                        Switch(
                            checked = isDynamic,
                            onCheckedChange = { isDynamic = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = Orange600, checkedTrackColor = Orange100)
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }
                
                // Eye shapes selection
                Text("Eye Shape", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Gray700)
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("square" to "Classic", "circle" to "Circular", "rounded" to "Rounded").forEach { (style, name) ->
                        FilterChip(
                            selected = eyeStyle == style,
                            onClick = { eyeStyle = style },
                            label = { Text(name) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Orange600,
                                selectedLabelColor = White
                            ),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // QR Pattern selection
                Text("QR Pattern Style", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Gray700)
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("square" to "Blocks", "dot" to "Dots", "line" to "Lines").forEach { (style, name) ->
                        FilterChip(
                            selected = patternStyle == style,
                            onClick = { patternStyle = style },
                            label = { Text(name) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Orange600,
                                selectedLabelColor = White
                            ),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Color Presets Row
                Text("Color Themes", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = Gray700)
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    colorPresets.forEach { (fg, bg) ->
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(bg)
                                .border(
                                    width = if (foregroundColor == fg && backgroundColor == bg && !isGradient) 2.dp else 1.dp,
                                    color = if (foregroundColor == fg && backgroundColor == bg && !isGradient) Orange600 else Gray300,
                                    shape = CircleShape
                                )
                                .clickable {
                                    foregroundColor = fg
                                    backgroundColor = bg
                                    foregroundHex = String.format("#%06X", 0xFFFFFF and fg.toArgb())
                                    backgroundHex = String.format("#%06X", 0xFFFFFF and bg.toArgb())
                                    isGradient = false
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(16.dp)
                                    .clip(CircleShape)
                                    .background(fg)
                            )
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Gradient setting
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = isGradient,
                        onCheckedChange = { isGradient = it }
                    )
                    Text("Use Foreground Color Gradient", color = Gray700)
                }
                
                if (isGradient) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = gradientStartHex,
                            onValueChange = { 
                                gradientStartHex = it
                                try {
                                    gradientStart = Color(android.graphics.Color.parseColor(it))
                                } catch (e: Exception) {}
                            },
                            label = { Text("Start Hex") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        )
                        OutlinedTextField(
                            value = gradientEndHex,
                            onValueChange = { 
                                gradientEndHex = it
                                try {
                                    gradientEnd = Color(android.graphics.Color.parseColor(it))
                                } catch (e: Exception) {}
                            },
                            label = { Text("End Hex") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                } else {
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedTextField(
                            value = foregroundHex,
                            onValueChange = { 
                                foregroundHex = it
                                try {
                                    foregroundColor = Color(android.graphics.Color.parseColor(it))
                                } catch (e: Exception) {}
                            },
                            label = { Text("Foreground Hex") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        )
                        OutlinedTextField(
                            value = backgroundHex,
                            onValueChange = { 
                                backgroundHex = it
                                try {
                                    backgroundColor = Color(android.graphics.Color.parseColor(it))
                                } catch (e: Exception) {}
                            },
                            label = { Text("Background Hex") },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Generate Button
        Button(
            onClick = { generateQRCode() },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Orange600),
            shape = RoundedCornerShape(16.dp),
            enabled = !isGenerating
        ) {
            if (isGenerating) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = White
                )
            } else {
                Icon(
                    imageVector = Icons.Default.QrCode,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Generate QR Code", style = MaterialTheme.typography.titleMedium)
            }
        }
        
        // QR Code Preview
        qrBitmap?.let { bitmap ->
            Spacer(modifier = Modifier.height(24.dp))
            
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = White),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Your QR Code",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Gray800
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = "Generated QR Code",
                        modifier = Modifier
                            .size(256.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .border(2.dp, Orange200, RoundedCornerShape(12.dp))
                            .padding(8.dp)
                    )
                    
                    Spacer(modifier = Modifier.height(20.dp))
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = { downloadQRCode() },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(Icons.Outlined.Download, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Download")
                        }
                        
                        Button(
                            onClick = { saveQRCode() },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = Orange600),
                            shape = RoundedCornerShape(12.dp),
                            enabled = !isSaving
                        ) {
                            if (isSaving) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = White
                                )
                            } else {
                                Icon(Icons.Outlined.Save, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Save")
                            }
                        }
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
    }
    
    // Save Dialog with Workspace selection
    if (showSaveDialog) {
        var expandedWorkspaceDropdown by remember { mutableStateOf(false) }
        
        AlertDialog(
            onDismissRequest = { showSaveDialog = false },
            title = { Text("Save QR Code") },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("QR Code Title") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    )
                    
                    // Workspace selection selector
                    if (isLoggedIn) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text("Choose Target Workspace", style = MaterialTheme.typography.bodySmall, color = Gray600)
                            Spacer(modifier = Modifier.height(4.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, Gray300, RoundedCornerShape(12.dp))
                                    .clickable { expandedWorkspaceDropdown = true }
                                    .padding(14.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(selectedWorkspaceName, style = MaterialTheme.typography.bodyMedium)
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                                
                                DropdownMenu(
                                    expanded = expandedWorkspaceDropdown,
                                    onDismissRequest = { expandedWorkspaceDropdown = false },
                                    modifier = Modifier.fillMaxWidth(0.8f)
                                ) {
                                    DropdownMenuItem(
                                        text = { Text("Personal Space") },
                                        onClick = {
                                            selectedWorkspaceId = null
                                            selectedWorkspaceName = "Personal Space"
                                            expandedWorkspaceDropdown = false
                                        }
                                    )
                                    workspacesList.forEach { ws ->
                                        DropdownMenuItem(
                                            text = { Text(ws.name) },
                                            onClick = {
                                                selectedWorkspaceId = ws.id
                                                selectedWorkspaceName = ws.name
                                                expandedWorkspaceDropdown = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showSaveDialog = false
                        saveQRCode()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Orange600)
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showSaveDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
    
    // Snackbar
    snackbarMessage?.let { message ->
        LaunchedEffect(message) {
            kotlinx.coroutines.delay(3000)
            snackbarMessage = null
        }
    }
}

private fun getPlaceholder(type: QRCodeType): String {
    return when (type) {
        QRCodeType.TEXT -> "Enter your text here..."
        QRCodeType.URL -> "Enter website URL (e.g., example.com)"
        QRCodeType.PHONE -> "Enter phone number"
        QRCodeType.SMS -> "Enter phone number for SMS"
        QRCodeType.LOCATION -> "Enter location coordinates"
        else -> "Enter content..."
    }
}
