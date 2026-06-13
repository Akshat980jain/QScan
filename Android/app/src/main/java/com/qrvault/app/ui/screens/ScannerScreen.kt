package com.qrvault.app.ui.screens

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.util.Size
import android.widget.Toast
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.accompanist.permissions.shouldShowRationale
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.qrvault.app.data.model.QRCodeRequest
import com.qrvault.app.data.repository.QRCodeRepository
import com.qrvault.app.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.Executors

@androidx.camera.core.ExperimentalGetImage
@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ScannerScreen(
    isLoggedIn: Boolean,
    onScanResult: (String) -> Unit,
    onClose: () -> Unit,
    onSignInClick: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val qrRepository = remember { QRCodeRepository(context) }
    val scope = rememberCoroutineScope()
    
    val cameraPermissionState = rememberPermissionState(Manifest.permission.CAMERA)
    
    var scannedResult by remember { mutableStateOf<String?>(null) }
    var isFlashOn by remember { mutableStateOf(false) }
    var showResultSheet by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }
    var showSaveDialog by remember { mutableStateOf(false) }
    var saveTitle by remember { mutableStateOf("") }
    
    // Library picker state
    var showLibraryPicker by remember { mutableStateOf(false) }
    var libraryQRCodes by remember { mutableStateOf<List<com.qrvault.app.data.model.QRCode>>(emptyList()) }
    var isLoadingLibrary by remember { mutableStateOf(false) }
    var selectedLibraryQR by remember { mutableStateOf<com.qrvault.app.data.model.QRCode?>(null) }
    
    LaunchedEffect(Unit) {
        if (!cameraPermissionState.status.isGranted) {
            cameraPermissionState.launchPermissionRequest()
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        when {
            cameraPermissionState.status.isGranted -> {
                // Camera Preview
                CameraPreview(
                    onQRCodeScanned = { result ->
                        if (scannedResult == null) {
                            scannedResult = result
                            showResultSheet = true
                            onScanResult(result)
                        }
                    },
                    isFlashOn = isFlashOn
                )
                
                // Overlay UI
                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Top Bar
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = onClose,
                            colors = IconButtonDefaults.iconButtonColors(
                                containerColor = Color.Black.copy(alpha = 0.5f),
                                contentColor = Color.White
                            )
                        ) {
                            Icon(
                                imageVector = Icons.Default.ArrowBack,
                                contentDescription = "Back"
                            )
                        }
                        
                        Text(
                            text = "Scan QR Code",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        
                        IconButton(
                            onClick = { isFlashOn = !isFlashOn },
                            colors = IconButtonDefaults.iconButtonColors(
                                containerColor = if (isFlashOn) Orange600 else Color.Black.copy(alpha = 0.5f),
                                contentColor = Color.White
                            )
                        ) {
                            Icon(
                                imageVector = if (isFlashOn) Icons.Default.FlashOn else Icons.Default.FlashOff,
                                contentDescription = "Flash"
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.weight(1f))
                    
                    // Scan Frame
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(280.dp)
                                .border(
                                    width = 3.dp,
                                    color = Orange600,
                                    shape = RoundedCornerShape(24.dp)
                                )
                        )
                    }
                    
                    Spacer(modifier = Modifier.weight(1f))
                    
                    // Bottom Instructions
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = Color.Black.copy(alpha = 0.7f)
                        )
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.QrCodeScanner,
                                contentDescription = null,
                                tint = Orange400,
                                modifier = Modifier.size(32.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Position QR code within the frame",
                                style = MaterialTheme.typography.bodyLarge,
                                color = Color.White,
                                textAlign = TextAlign.Center
                            )
                            Text(
                                text = "Scanning will happen automatically",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.7f),
                                textAlign = TextAlign.Center
                            )
                            
                            // Select from Library Button
                            if (isLoggedIn) {
                                Spacer(modifier = Modifier.height(16.dp))
                                Divider(color = Color.White.copy(alpha = 0.3f))
                                Spacer(modifier = Modifier.height(16.dp))
                                
                                OutlinedButton(
                                    onClick = {
                                        isLoadingLibrary = true
                                        scope.launch {
                                            val result = qrRepository.getQRCodes()
                                            result.fold(
                                                onSuccess = { 
                                                    libraryQRCodes = it
                                                    showLibraryPicker = true
                                                },
                                                onFailure = { 
                                                    Toast.makeText(context, "Failed to load library", Toast.LENGTH_SHORT).show()
                                                }
                                            )
                                            isLoadingLibrary = false
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(
                                        contentColor = Color.White
                                    ),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Orange400),
                                    enabled = !isLoadingLibrary
                                ) {
                                    if (isLoadingLibrary) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(20.dp),
                                            color = Color.White,
                                            strokeWidth = 2.dp
                                        )
                                    } else {
                                        Icon(Icons.Outlined.Folder, contentDescription = null)
                                    }
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Select from Library")
                                }
                            }
                        }
                    }
                }
            }
            
            cameraPermissionState.status.shouldShowRationale -> {
                PermissionRationale(
                    onRequestPermission = { cameraPermissionState.launchPermissionRequest() }
                )
            }
            
            else -> {
                PermissionDenied()
            }
        }
        
        // Result Bottom Sheet
        if (showResultSheet && scannedResult != null) {
            ModalBottomSheet(
                onDismissRequest = {
                    showResultSheet = false
                    scannedResult = null
                },
                containerColor = White
            ) {
                ScanResultContent(
                    result = scannedResult!!,
                    isLoggedIn = isLoggedIn,
                    isSaving = isSaving,
                    onCopy = {
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("QR Result", scannedResult))
                        Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
                    },
                    onOpen = {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(scannedResult))
                            context.startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(context, "Cannot open this content", Toast.LENGTH_SHORT).show()
                        }
                    },
                    onShare = {
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, scannedResult)
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                    },
                    onSaveToLibrary = {
                        if (isLoggedIn) {
                            showSaveDialog = true
                        } else {
                            onSignInClick()
                        }
                    },
                    onDismiss = {
                        showResultSheet = false
                        scannedResult = null
                    }
                )
            }
        }
        
        // Save to Library Dialog
        if (showSaveDialog && scannedResult != null) {
            AlertDialog(
                onDismissRequest = { showSaveDialog = false },
                title = { Text("Save to Library") },
                text = {
                    OutlinedTextField(
                        value = saveTitle,
                        onValueChange = { saveTitle = it },
                        label = { Text("QR Code Title") },
                        placeholder = { Text("Enter a name for this QR code") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true
                    )
                },
                confirmButton = {
                    Button(
                        onClick = {
                            val titleToSave = saveTitle.ifBlank { "Scanned QR" }
                            val contentToSave = scannedResult ?: return@Button
                            
                            isSaving = true
                            scope.launch {
                                // Generate QR code bitmap
                                val bitmap = withContext(Dispatchers.Default) {
                                    try {
                                        val hints = hashMapOf<EncodeHintType, Any>()
                                        hints[EncodeHintType.MARGIN] = 2
                                        hints[EncodeHintType.CHARACTER_SET] = "UTF-8"
                                        
                                        val writer = QRCodeWriter()
                                        val bitMatrix = writer.encode(contentToSave, BarcodeFormat.QR_CODE, 256, 256, hints)
                                        
                                        val width = bitMatrix.width
                                        val height = bitMatrix.height
                                        val bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
                                        
                                        for (x in 0 until width) {
                                            for (y in 0 until height) {
                                                bmp.setPixel(x, y, if (bitMatrix[x, y]) Color.Black.toArgb() else Color.White.toArgb())
                                            }
                                        }
                                        bmp
                                    } catch (e: Exception) {
                                        null
                                    }
                                }
                                
                                if (bitmap != null) {
                                    // Convert to base64
                                    val imageBase64 = withContext(Dispatchers.IO) {
                                        try {
                                            val baos = java.io.ByteArrayOutputStream()
                                            bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos)
                                            "data:image/png;base64," + android.util.Base64.encodeToString(baos.toByteArray(), android.util.Base64.NO_WRAP)
                                        } catch (e: Exception) {
                                            null
                                        }
                                    }
                                    
                                    if (imageBase64 != null) {
                                        // Determine type
                                        val qrType = when {
                                            contentToSave.startsWith("http://") || contentToSave.startsWith("https://") -> "url"
                                            contentToSave.startsWith("mailto:") -> "email"
                                            contentToSave.startsWith("tel:") -> "phone"
                                            contentToSave.startsWith("sms:") -> "sms"
                                            contentToSave.startsWith("WIFI:") -> "wifi"
                                            contentToSave.startsWith("BEGIN:VCARD") -> "contact"
                                            else -> "text"
                                        }
                                        
                                        val request = QRCodeRequest(
                                            name = titleToSave,
                                            content = contentToSave,
                                            type = qrType,
                                            image = imageBase64
                                        )
                                        
                                        val result = qrRepository.createQRCode(request)
                                        result.fold(
                                            onSuccess = {
                                                Toast.makeText(context, "Saved to Library!", Toast.LENGTH_SHORT).show()
                                                showSaveDialog = false
                                                saveTitle = ""
                                            },
                                            onFailure = { error ->
                                                Toast.makeText(context, error.message ?: "Failed to save", Toast.LENGTH_SHORT).show()
                                            }
                                        )
                                    } else {
                                        Toast.makeText(context, "Failed to encode QR image", Toast.LENGTH_SHORT).show()
                                    }
                                } else {
                                    Toast.makeText(context, "Failed to generate QR code", Toast.LENGTH_SHORT).show()
                                }
                                isSaving = false
                            }
                        },
                        enabled = !isSaving,
                        colors = ButtonDefaults.buttonColors(containerColor = Orange600),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        if (isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Save")
                        }
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showSaveDialog = false }) {
                        Text("Cancel")
                    }
                }
            )
        }
        
        // Library Picker Bottom Sheet
        if (showLibraryPicker) {
            ModalBottomSheet(
                onDismissRequest = { showLibraryPicker = false },
                containerColor = White
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp)
                ) {
                    Text(
                        text = "Select from Library",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = Gray800
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = "Tap a QR code to view it",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray600
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    if (libraryQRCodes.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(200.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Outlined.Folder,
                                    contentDescription = null,
                                    modifier = Modifier.size(48.dp),
                                    tint = Gray400
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "No saved QR codes",
                                    color = Gray500
                                )
                            }
                        }
                    } else {
                        androidx.compose.foundation.lazy.grid.LazyVerticalGrid(
                            columns = androidx.compose.foundation.lazy.grid.GridCells.Fixed(3),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.heightIn(max = 400.dp)
                        ) {
                            items(libraryQRCodes.size) { index ->
                                val qr = libraryQRCodes[index]
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            selectedLibraryQR = qr
                                            showLibraryPicker = false
                                        },
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .aspectRatio(1f),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = Orange50)
                                    ) {
                                        Box(
                                            modifier = Modifier.fillMaxSize(),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            val bitmap = remember(qr.image) {
                                                if (qr.image.isNotEmpty()) {
                                                    try {
                                                        val base64String = if (qr.image.contains(",")) {
                                                            qr.image.substringAfter(",")
                                                        } else {
                                                            qr.image
                                                        }
                                                        val decodedBytes = android.util.Base64.decode(base64String, android.util.Base64.DEFAULT)
                                                        android.graphics.BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                                                    } catch (e: Exception) {
                                                        null
                                                    }
                                                } else null
                                            }
                                            
                                            if (bitmap != null) {
                                                androidx.compose.foundation.Image(
                                                    bitmap = bitmap.asImageBitmap(),
                                                    contentDescription = qr.title,
                                                    modifier = Modifier
                                                        .fillMaxSize()
                                                        .padding(8.dp),
                                                    contentScale = androidx.compose.ui.layout.ContentScale.Fit
                                                )
                                            } else {
                                                Icon(
                                                    imageVector = Icons.Outlined.QrCode,
                                                    contentDescription = null,
                                                    modifier = Modifier.size(40.dp),
                                                    tint = Orange600
                                                )
                                            }
                                        }
                                    }
                                    
                                    Spacer(modifier = Modifier.height(4.dp))
                                    
                                    Text(
                                        text = qr.title.ifEmpty { "Untitled" },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Gray800,
                                        maxLines = 1,
                                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
        
        // Selected Library QR Detail
        selectedLibraryQR?.let { qr ->
            AlertDialog(
                onDismissRequest = { selectedLibraryQR = null },
                modifier = Modifier.fillMaxWidth(),
                title = {
                    Column {
                        Text(
                            text = qr.title.ifEmpty { "Untitled" },
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = Gray800
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = Orange100
                        ) {
                            Text(
                                text = qr.type.uppercase(),
                                style = MaterialTheme.typography.labelMedium,
                                color = Orange600,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                            )
                        }
                    }
                },
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Large QR Code Image
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(16.dp))
                                .background(White),
                            contentAlignment = Alignment.Center
                        ) {
                            val bitmap = remember(qr.image) {
                                if (qr.image.isNotEmpty()) {
                                    try {
                                        val base64String = if (qr.image.contains(",")) {
                                            qr.image.substringAfter(",")
                                        } else {
                                            qr.image
                                        }
                                        val decodedBytes = android.util.Base64.decode(base64String, android.util.Base64.DEFAULT)
                                        android.graphics.BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                                    } catch (e: Exception) {
                                        null
                                    }
                                } else null
                            }
                            
                            if (bitmap != null) {
                                androidx.compose.foundation.Image(
                                    bitmap = bitmap.asImageBitmap(),
                                    contentDescription = "QR Code",
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .padding(16.dp),
                                    contentScale = androidx.compose.ui.layout.ContentScale.Fit
                                )
                            } else {
                                Icon(
                                    imageVector = Icons.Outlined.QrCode,
                                    contentDescription = null,
                                    modifier = Modifier.size(120.dp),
                                    tint = Orange600
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        // QR Content
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Orange50)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = "Content",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Gray600
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = qr.content,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Gray800,
                                    maxLines = 3,
                                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                },
                confirmButton = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Copy and Share Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("QR Content", qr.content)
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "Copied to clipboard!", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Outlined.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Copy")
                            }
                            
                            OutlinedButton(
                                onClick = {
                                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                        type = "text/plain"
                                        putExtra(Intent.EXTRA_TEXT, qr.content)
                                    }
                                    context.startActivity(Intent.createChooser(shareIntent, "Share via"))
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Share")
                            }
                        }
                        
                        // Open Link Button (for URLs)
                        if (qr.content.startsWith("http://") || qr.content.startsWith("https://")) {
                            Button(
                                onClick = {
                                    try {
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(qr.content))
                                        context.startActivity(intent)
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Cannot open this link", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Orange600),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(Icons.Outlined.OpenInBrowser, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Open Link")
                            }
                        }
                        
                        // Close Button
                        TextButton(
                            onClick = { selectedLibraryQR = null },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Close", color = Gray600)
                        }
                    }
                }
            )
        }
    }
}

@androidx.camera.core.ExperimentalGetImage
@Composable
private fun CameraPreview(
    onQRCodeScanned: (String) -> Unit,
    isFlashOn: Boolean
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    val barcodeScanner = remember { BarcodeScanning.getClient() }
    var camera by remember { mutableStateOf<androidx.camera.core.Camera?>(null) }
    
    // Handle flash state changes
    LaunchedEffect(isFlashOn) {
        camera?.cameraControl?.enableTorch(isFlashOn)
    }
    
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
            
            cameraProviderFuture.addListener({
                try {
                    val cameraProvider = cameraProviderFuture.get()
                    
                    val preview = Preview.Builder().build().also {
                        it.setSurfaceProvider(previewView.surfaceProvider)
                    }
                    
                    val imageAnalysis = ImageAnalysis.Builder()
                        .setTargetResolution(Size(1280, 720))
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                        .also { analysis ->
                            analysis.setAnalyzer(cameraExecutor) { imageProxy ->
                                val mediaImage = imageProxy.image
                                if (mediaImage != null) {
                                    val inputImage = InputImage.fromMediaImage(
                                        mediaImage,
                                        imageProxy.imageInfo.rotationDegrees
                                    )
                                    
                                    barcodeScanner.process(inputImage)
                                        .addOnSuccessListener { barcodes ->
                                            for (barcode in barcodes) {
                                                barcode.rawValue?.let { value ->
                                                    if (value.isNotEmpty()) {
                                                        onQRCodeScanned(value)
                                                    }
                                                }
                                            }
                                        }
                                        .addOnFailureListener { e ->
                                            android.util.Log.e("QRScanner", "Barcode scanning failed", e)
                                        }
                                        .addOnCompleteListener {
                                            imageProxy.close()
                                        }
                                } else {
                                    imageProxy.close()
                                }
                            }
                        }
                    
                    val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
                    
                    cameraProvider.unbindAll()
                    camera = cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        cameraSelector,
                        preview,
                        imageAnalysis
                    )
                } catch (e: Exception) {
                    android.util.Log.e("QRScanner", "Camera initialization failed", e)
                }
            }, ContextCompat.getMainExecutor(ctx))
            
            previewView
        }
    )
}

@Composable
private fun ScanResultContent(
    result: String,
    isLoggedIn: Boolean,
    isSaving: Boolean,
    onCopy: () -> Unit,
    onOpen: () -> Unit,
    onShare: () -> Unit,
    onSaveToLibrary: () -> Unit,
    onDismiss: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Scan Result",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Gray800
            )
            
            IconButton(onClick = onDismiss) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Close",
                    tint = Gray600
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Orange50)
        ) {
            Text(
                text = result,
                style = MaterialTheme.typography.bodyLarge,
                color = Gray800,
                modifier = Modifier.padding(16.dp)
            )
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedButton(
                onClick = onCopy,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Outlined.ContentCopy, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Copy")
            }
            
            OutlinedButton(
                onClick = onShare,
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Outlined.Share, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Share")
            }
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Save to Library Button
        Button(
            onClick = onSaveToLibrary,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = if (isLoggedIn) Orange600 else Gray400
            ),
            shape = RoundedCornerShape(12.dp),
            enabled = !isSaving
        ) {
            if (isSaving) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = Color.White,
                    strokeWidth = 2.dp
                )
                Spacer(modifier = Modifier.width(8.dp))
            } else {
                Icon(Icons.Outlined.BookmarkAdd, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(if (isLoggedIn) "Save to Library" else "Sign in to Save")
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        if (result.startsWith("http://") || result.startsWith("https://")) {
            OutlinedButton(
                onClick = onOpen,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Outlined.OpenInBrowser, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Open Link")
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun PermissionRationale(onRequestPermission: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Gray900)
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = White)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Outlined.CameraAlt,
                    contentDescription = null,
                    tint = Orange600,
                    modifier = Modifier.size(48.dp)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = "Camera Permission Required",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Gray800
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "To scan QR codes, we need access to your camera. Your privacy is important to us.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Gray600,
                    textAlign = TextAlign.Center
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                    onClick = onRequestPermission,
                    colors = ButtonDefaults.buttonColors(containerColor = Orange600),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Grant Permission")
                }
            }
        }
    }
}

@Composable
private fun PermissionDenied() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Gray900)
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = White)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Outlined.CameraAlt,
                    contentDescription = null,
                    tint = Error,
                    modifier = Modifier.size(48.dp)
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = "Camera Access Denied",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = Gray800
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "Please enable camera permission in your device settings to use the QR scanner.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Gray600,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
