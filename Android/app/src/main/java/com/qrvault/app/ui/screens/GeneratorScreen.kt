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
import com.qrvault.app.data.network.RetrofitClient
import com.qrvault.app.util.QRCodeGenerator
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
    
    val isDark = MaterialTheme.colorScheme.primary == md_theme_dark_primary
    
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
        Pair(Color(0xFFB91C1C), Color(0xFFFEF2F2)), // Red
        Pair(Color.White, Color(0xFF1F2937))        // Dark
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
    
    fun generateQRCodeBitmap(qrContent: String): Bitmap? {
        val fg = foregroundColor.toArgb()
        val bg = backgroundColor.toArgb()
        val gs = gradientStart.toArgb()
        val ge = gradientEnd.toArgb()
        return QRCodeGenerator.generate(
            qrContent = qrContent,
            qrSize = qrSize,
            foregroundColor = fg,
            backgroundColor = bg,
            eyeStyle = eyeStyle,
            patternStyle = patternStyle,
            isGradient = isGradient,
            gradientStart = gs,
            gradientEnd = ge
        )
    }

    fun generateQRCode() {
        val qrContent = generateContent()
        
        // Input validation
        val isInputValid = when (selectedType) {
            QRCodeType.TEXT, QRCodeType.URL, QRCodeType.PHONE, QRCodeType.SMS, QRCodeType.LOCATION -> {
                content.isNotBlank()
            }
            QRCodeType.EMAIL -> {
                emailAddress.isNotBlank()
            }
            QRCodeType.WIFI -> {
                wifiSsid.isNotBlank()
            }
            QRCodeType.VCARD -> {
                vcardName.isNotBlank() || vcardPhone.isNotBlank() || vcardEmail.isNotBlank()
            }
        }
        
        if (!isInputValid) {
            Toast.makeText(context, "Please enter the required fields first", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (qrContent.isBlank()) return
        
        isGenerating = true
        scope.launch {
            qrBitmap = withContext(Dispatchers.Default) {
                generateQRCodeBitmap(qrContent)
            }
            if (qrBitmap == null) {
                Toast.makeText(context, "Failed to render QR Code", Toast.LENGTH_LONG).show()
            }
            isGenerating = false
        }
    }

    // Automatically regenerate QR code on style changes if one is already generated
    LaunchedEffect(eyeStyle, patternStyle, foregroundColor, backgroundColor, isGradient, gradientStart, gradientEnd) {
        if (qrBitmap != null) {
            generateQRCode()
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
            val isDynamicQR = isDynamic && selectedType == QRCodeType.URL
            val payloadContent = generateContent()
            
            var finalContent = payloadContent
            var shortId: String? = null
            var bitmapToEncode = currentBitmap

            if (isDynamicQR) {
                // Generate a random 8-character hex string
                shortId = (1..8).map { 
                    val chars = "0123456789abcdef"
                    chars[java.util.Random().nextInt(chars.length)]
                }.joinToString("")
                
                val baseUrlClean = if (RetrofitClient.BASE_URL.endsWith("/")) {
                    RetrofitClient.BASE_URL.substring(0, RetrofitClient.BASE_URL.length - 1)
                } else {
                    RetrofitClient.BASE_URL
                }
                finalContent = "$baseUrlClean/r/$shortId"

                // Regenerate bitmap with the redirect URL
                val dynamicBitmap = withContext(Dispatchers.Default) {
                    generateQRCodeBitmap(finalContent)
                }
                if (dynamicBitmap != null) {
                    bitmapToEncode = dynamicBitmap
                }
            }

            // Convert bitmap to Base64
            val imageBase64 = withContext(Dispatchers.Default) {
                try {
                    val byteArrayOutputStream = java.io.ByteArrayOutputStream()
                    bitmapToEncode.compress(Bitmap.CompressFormat.PNG, 100, byteArrayOutputStream)
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
                content = finalContent,
                type = backendType,
                image = imageBase64,
                size = qrSize,
                foregroundColor = String.format("#%06X", 0xFFFFFF and (if (isGradient) gradientStart.toArgb() else foregroundColor.toArgb())),
                backgroundColor = String.format("#%06X", 0xFFFFFF and backgroundColor.toArgb()),
                isDynamic = isDynamicQR,
                targetUrl = if (isDynamicQR) payloadContent else null,
                shortId = shortId,
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
    
    val gradientColors = if (isDark) {
        listOf(
            MaterialTheme.colorScheme.background,
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        )
    } else {
        listOf(Orange50, White, Orange100.copy(alpha = 0.5f))
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = androidx.compose.ui.graphics.Brush.verticalGradient(colors = gradientColors))
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        // Title
        Text(
            text = "Generate QR Code",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "Create customized QR codes for any content type",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // QR Type Selection
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(
                1.dp,
                MaterialTheme.colorScheme.outline.copy(alpha = if (isDark) 0.3f else 0.5f)
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Text(
                    text = "Content Type",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
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
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                    labelColor = MaterialTheme.colorScheme.onSurfaceVariant
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
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(
                1.dp,
                MaterialTheme.colorScheme.outline.copy(alpha = if (isDark) 0.3f else 0.5f)
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Text(
                    text = "Content",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
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
                            Text("Encryption:", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.width(8.dp))
                            listOf("WPA", "WEP", "None").forEach { enc ->
                                FilterChip(
                                    selected = wifiEncryption == enc,
                                    onClick = { wifiEncryption = enc },
                                    label = { Text(enc) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                        labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                                    ),
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
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(
                1.dp,
                MaterialTheme.colorScheme.outline.copy(alpha = if (isDark) 0.3f else 0.5f)
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Text(
                    text = "Visual Styling & Settings",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Dynamic link redirection switch
                if (selectedType == QRCodeType.URL) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                color = if (isDark) MaterialTheme.colorScheme.surfaceVariant else Orange50.copy(alpha = 0.5f),
                                shape = RoundedCornerShape(12.dp)
                            )
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Dynamic Redirect Link",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Redirects through server to track scans & update URL later",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = isDynamic,
                            onCheckedChange = { isDynamic = it },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = MaterialTheme.colorScheme.primary,
                                checkedTrackColor = MaterialTheme.colorScheme.primaryContainer,
                                uncheckedThumbColor = MaterialTheme.colorScheme.outline,
                                uncheckedTrackColor = MaterialTheme.colorScheme.surfaceVariant
                            )
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                }
                
                // Eye shapes selection
                Text(
                    text = "Eye Shape",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
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
                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                            ),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // QR Pattern selection
                Text(
                    text = "QR Pattern Style",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
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
                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                            ),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                // Color Presets Row
                Text(
                    text = "Color Themes",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
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
                                    color = if (foregroundColor == fg && backgroundColor == bg && !isGradient) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
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
                        onCheckedChange = { isGradient = it },
                        colors = CheckboxDefaults.colors(
                            checkedColor = MaterialTheme.colorScheme.primary,
                            checkmarkColor = MaterialTheme.colorScheme.onPrimary
                        )
                    )
                    Text("Use Foreground Color Gradient", color = MaterialTheme.colorScheme.onSurface)
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
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ),
            shape = RoundedCornerShape(16.dp),
            enabled = !isGenerating
        ) {
            if (isGenerating) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = MaterialTheme.colorScheme.onPrimary
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
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(
                    1.dp,
                    MaterialTheme.colorScheme.outline.copy(alpha = if (isDark) 0.3f else 0.5f)
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
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
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = "Generated QR Code",
                        modifier = Modifier
                            .size(256.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .border(2.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
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
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Icon(Icons.Outlined.Download, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Download")
                        }
                        
                        Button(
                            onClick = { saveQRCode() },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                                contentColor = MaterialTheme.colorScheme.onPrimary
                            ),
                            shape = RoundedCornerShape(12.dp),
                            enabled = !isSaving
                        ) {
                            if (isSaving) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = MaterialTheme.colorScheme.onPrimary
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
                            Text("Choose Target Workspace", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(4.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
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
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
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
