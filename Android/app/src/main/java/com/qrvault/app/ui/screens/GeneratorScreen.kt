package com.qrvault.app.ui.screens

import android.content.ContentValues
import android.graphics.Bitmap
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
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
import com.qrvault.app.data.model.QRCodeType
import com.qrvault.app.data.model.QRCodeRequest
import com.qrvault.app.data.repository.QRCodeRepository
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
    var qrSize by remember { mutableStateOf(256) }
    
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
                    hints[EncodeHintType.MARGIN] = 2
                    hints[EncodeHintType.CHARACTER_SET] = "UTF-8"
                    
                    val writer = QRCodeWriter()
                    val bitMatrix = writer.encode(qrContent, BarcodeFormat.QR_CODE, qrSize, qrSize, hints)
                    
                    val width = bitMatrix.width
                    val height = bitMatrix.height
                    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                    
                    for (x in 0 until width) {
                        for (y in 0 until height) {
                            bitmap.setPixel(
                                x, y,
                                if (bitMatrix[x, y]) foregroundColor.toArgb() else backgroundColor.toArgb()
                            )
                        }
                    }
                    bitmap
                } catch (e: Exception) {
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
                QRCodeType.LOCATION -> "text" // Backend doesn't have location type
                else -> selectedType.value
            }
            
            val request = QRCodeRequest(
                name = title,
                content = generateContent(),
                type = backendType,
                image = imageBase64,
                size = qrSize,
                foregroundColor = String.format("#%06X", 0xFFFFFF and foregroundColor.toArgb()),
                backgroundColor = String.format("#%06X", 0xFFFFFF and backgroundColor.toArgb())
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
                        // Fill remaining space if row is incomplete
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
    
    // Save Dialog
    if (showSaveDialog) {
        AlertDialog(
            onDismissRequest = { showSaveDialog = false },
            title = { Text("Save QR Code") },
            text = {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("QR Code Title") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
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
