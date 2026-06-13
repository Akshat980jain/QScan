package com.qrvault.app.ui.screens

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.qrvault.app.data.model.QRCode
import com.qrvault.app.data.repository.QRCodeRepository
import com.qrvault.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(
    isLoggedIn: Boolean,
    onSignInClick: () -> Unit,
    onQRCodeClick: (String) -> Unit
) {
    val context = LocalContext.current
    val qrRepository = remember { QRCodeRepository(context) }
    val scope = rememberCoroutineScope()
    
    var qrCodes by remember { mutableStateOf<List<QRCode>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedTypeFilter by remember { mutableStateOf("All") }
    var selectedCategoryFilter by remember { mutableStateOf("All") }
    var showFavoritesOnly by remember { mutableStateOf(false) }
    var selectedQRCode by remember { mutableStateOf<QRCode?>(null) }
    
    val typeFilters = listOf("All", "Text", "URL", "WiFi", "vCard", "Email")
    val categoryFilters = listOf("All", "Work", "Personal", "Social", "Other")
    
    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) {
            isLoading = true
            errorMessage = null
            try {
                android.util.Log.d("LibraryScreen", "Fetching QR codes...")
                val result = qrRepository.getQRCodes()
                result.fold(
                    onSuccess = { 
                        android.util.Log.d("LibraryScreen", "Loaded ${it.size} QR codes")
                        qrCodes = it 
                    },
                    onFailure = { 
                        android.util.Log.e("LibraryScreen", "Failed to load QR codes: ${it.message}")
                        errorMessage = it.message 
                    }
                )
            } catch (e: Exception) {
                android.util.Log.e("LibraryScreen", "Exception loading QR codes", e)
                errorMessage = e.message ?: "An error occurred"
            } finally {
                isLoading = false
                android.util.Log.d("LibraryScreen", "Loading complete, isLoading=false")
            }
        }
    }
    
    val filteredQRCodes = qrCodes.filter { qr ->
        val matchesSearch = searchQuery.isEmpty() || 
            qr.title.contains(searchQuery, ignoreCase = true) ||
            qr.content.contains(searchQuery, ignoreCase = true)
        val matchesType = selectedTypeFilter == "All" || 
            qr.type.equals(selectedTypeFilter, ignoreCase = true)
        val matchesCategory = selectedCategoryFilter == "All" ||
            qr.category.equals(selectedCategoryFilter, ignoreCase = true)
        val matchesFavorite = !showFavoritesOnly || qr.isFavorite
        matchesSearch && matchesType && matchesCategory && matchesFavorite
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Orange50, White, Orange100.copy(alpha = 0.5f))
                )
            )
    ) {
        // Header
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "QR Library",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = Gray800
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Manage and organize all your QR codes",
                style = MaterialTheme.typography.bodyMedium,
                color = Gray600
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search QR codes...") },
                leadingIcon = {
                    Icon(Icons.Outlined.Search, contentDescription = "Search")
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Outlined.Clear, contentDescription = "Clear")
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Favorites toggle and Type filters
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Favorites toggle
                FilterChip(
                    selected = showFavoritesOnly,
                    onClick = { showFavoritesOnly = !showFavoritesOnly },
                    label = { Text("⭐ Favorites") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Error,
                        selectedLabelColor = White
                    )
                )
                // Type filters
                typeFilters.forEach { filter ->
                    FilterChip(
                        selected = selectedTypeFilter == filter,
                        onClick = { selectedTypeFilter = filter },
                        label = { Text(filter) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Orange600,
                            selectedLabelColor = White
                        )
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Category filters
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                categoryFilters.forEach { category ->
                    FilterChip(
                        selected = selectedCategoryFilter == category,
                        onClick = { selectedCategoryFilter = category },
                        label = { Text(category) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = Gray800,
                            selectedLabelColor = White
                        )
                    )
                }
            }
        }
        
        // Content
        if (!isLoggedIn) {
            // Not logged in state
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Lock,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = Orange600
                        )
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Text(
                            text = "Sign in to access your library",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = Gray800
                        )
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Text(
                            text = "Create an account to save and manage your QR codes across devices",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Gray600
                        )
                        
                        Spacer(modifier = Modifier.height(24.dp))
                        
                        Button(
                            onClick = onSignInClick,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Orange600),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Sign In")
                        }
                    }
                }
            }
        } else if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Orange600)
            }
        } else if (errorMessage != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Error,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = Error
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = errorMessage ?: "Something went wrong",
                        style = MaterialTheme.typography.bodyLarge,
                        color = Gray600
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = {
                            scope.launch {
                                isLoading = true
                                errorMessage = null
                                val result = qrRepository.getQRCodes()
                                result.fold(
                                    onSuccess = { qrCodes = it },
                                    onFailure = { errorMessage = it.message }
                                )
                                isLoading = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Orange600)
                    ) {
                        Text("Retry")
                    }
                }
            }
        } else if (filteredQRCodes.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Outlined.QrCode,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = Gray400
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = if (searchQuery.isEmpty()) "No QR codes yet" else "No results found",
                        style = MaterialTheme.typography.titleMedium,
                        color = Gray600
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (searchQuery.isEmpty()) 
                            "Generate your first QR code to get started" 
                        else 
                            "Try a different search term",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Gray500
                    )
                }
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(filteredQRCodes) { qrCode ->
                    QRCodeCard(
                        qrCode = qrCode,
                        onClick = { selectedQRCode = qrCode },
                        onDelete = {
                            scope.launch {
                                qrRepository.deleteQRCode(qrCode.id)
                                val result = qrRepository.getQRCodes()
                                result.fold(
                                    onSuccess = { qrCodes = it },
                                    onFailure = { }
                                )
                            }
                        },
                        onFavoriteToggle = { isFavorite ->
                            scope.launch {
                                qrRepository.toggleFavorite(qrCode.id)
                            }
                        },
                        onShare = {
                            val shareIntent = android.content.Intent().apply {
                                action = android.content.Intent.ACTION_SEND
                                putExtra(android.content.Intent.EXTRA_TEXT, "${qrCode.title}\n\n${qrCode.content}")
                                type = "text/plain"
                            }
                            context.startActivity(android.content.Intent.createChooser(shareIntent, "Share QR Code"))
                        }
                    )
                }
            }
        }
    }
    
    // QR Code Detail Dialog
    selectedQRCode?.let { qrCode ->
        AlertDialog(
            onDismissRequest = { selectedQRCode = null },
            modifier = Modifier.fillMaxWidth(),
            title = {
                Column {
                    Text(
                        text = qrCode.title.ifEmpty { "Untitled" },
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
                            text = qrCode.type.uppercase(),
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
                        val bitmap = remember(qrCode.image) {
                            if (qrCode.image.isNotEmpty()) {
                                try {
                                    val base64String = if (qrCode.image.contains(",")) {
                                        qrCode.image.substringAfter(",")
                                    } else {
                                        qrCode.image
                                    }
                                    val decodedBytes = Base64.decode(base64String, Base64.DEFAULT)
                                    BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                                } catch (e: Exception) {
                                    null
                                }
                            } else {
                                null
                            }
                        }
                        
                        if (bitmap != null) {
                            Image(
                                bitmap = bitmap.asImageBitmap(),
                                contentDescription = "QR Code",
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(16.dp),
                                contentScale = ContentScale.Fit
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
                        Column(
                            modifier = Modifier.padding(12.dp)
                        ) {
                            Text(
                                text = "Content",
                                style = MaterialTheme.typography.labelMedium,
                                color = Gray600
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = qrCode.content,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Gray800,
                                maxLines = 3,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            // Copy to clipboard
                            val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                            val clip = android.content.ClipData.newPlainText("QR Content", qrCode.content)
                            clipboard.setPrimaryClip(clip)
                            android.widget.Toast.makeText(context, "Copied to clipboard", android.widget.Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Outlined.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Copy")
                    }
                    
                    Button(
                        onClick = { selectedQRCode = null },
                        colors = ButtonDefaults.buttonColors(containerColor = Orange600),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Close")
                    }
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun QRCodeCard(
    qrCode: QRCode,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    onFavoriteToggle: (Boolean) -> Unit = {},
    onShare: () -> Unit = {}
) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    var isFavorite by remember(qrCode.isFavorite) { mutableStateOf(qrCode.isFavorite) }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = White),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        onClick = onClick
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            // Top row: Favorite & Share
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Favorite button
                IconButton(
                    onClick = {
                        isFavorite = !isFavorite
                        onFavoriteToggle(isFavorite)
                    },
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                        contentDescription = "Favorite",
                        tint = if (isFavorite) Error else Gray400,
                        modifier = Modifier.size(20.dp)
                    )
                }
                
                // Share button
                IconButton(
                    onClick = onShare,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Share,
                        contentDescription = "Share",
                        tint = Gray500,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
            
            // QR Preview - decode base64 image
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Orange50),
                contentAlignment = Alignment.Center
            ) {
                // Decode base64 image
                val bitmap = remember(qrCode.image) {
                    if (qrCode.image.isNotEmpty()) {
                        try {
                            // Remove data URL prefix if present
                            val base64String = if (qrCode.image.contains(",")) {
                                qrCode.image.substringAfter(",")
                            } else {
                                qrCode.image
                            }
                            val decodedBytes = Base64.decode(base64String, Base64.DEFAULT)
                            BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                        } catch (e: Exception) {
                            null
                        }
                    } else {
                        null
                    }
                }
                
                if (bitmap != null) {
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = "QR Code",
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(8.dp),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    // Fallback to placeholder icon
                    Icon(
                        imageVector = Icons.Outlined.QrCode,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = Orange600
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(10.dp))
            
            Text(
                text = qrCode.title.ifEmpty { "Untitled" },
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = Gray800,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            
            Spacer(modifier = Modifier.height(6.dp))
            
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Type badge
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Orange100
                ) {
                    Text(
                        text = qrCode.type.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = Orange600,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                    )
                }
                
                Spacer(modifier = Modifier.width(4.dp))
                
                // Category badge
                if (qrCode.category != "general") {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Gray200
                    ) {
                        Text(
                            text = qrCode.category.replaceFirstChar { it.uppercase() },
                            style = MaterialTheme.typography.labelSmall,
                            color = Gray600,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.weight(1f))
                
                IconButton(
                    onClick = { showDeleteDialog = true },
                    modifier = Modifier.size(24.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Delete,
                        contentDescription = "Delete",
                        tint = Gray500,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
    
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete QR Code") },
            text = { Text("Are you sure you want to delete \"${qrCode.title}\"? This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteDialog = false
                        onDelete()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Error)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

