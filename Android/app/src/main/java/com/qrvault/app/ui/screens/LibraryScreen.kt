package com.qrvault.app.ui.screens

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.qrvault.app.data.model.*
import com.qrvault.app.data.repository.QRCodeRepository
import com.qrvault.app.util.QRCodeGenerator
import com.qrvault.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibraryScreen(
    isLoggedIn: Boolean,
    onSignInClick: () -> Unit
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
    
    // Workspaces
    var selectedWorkspaceId by remember { mutableStateOf<String?>(null) }
    var selectedWorkspaceName by remember { mutableStateOf("Personal Space") }
    var workspacesList by remember { mutableStateOf<List<Workspace>>(emptyList()) }
    var expandedWorkspaceDropdown by remember { mutableStateOf(false) }
    
    // refreshKey increments to force a reload (used after saving a QR from GeneratorScreen)
    var refreshKey by remember { mutableStateOf(0) }
    
    val typeFilters = listOf("All", "Text", "URL", "WiFi", "vCard", "Email")
    val categoryFilters = listOf("All", "Work", "Personal", "Social", "Other")

    // Shared fetch function so it can be called from both LaunchedEffect and refresh button
    suspend fun loadQRCodes() {
        if (!isLoggedIn) return
        isLoading = true
        errorMessage = null
        try {
            android.util.Log.d("LibraryScreen", "Fetching QR codes for workspace: $selectedWorkspaceId (refreshKey=$refreshKey)")
            val result = qrRepository.getQRCodes(selectedWorkspaceId)
            result.fold(
                onSuccess = { qrCodes = it },
                onFailure = { errorMessage = it.message }
            )
            if (workspacesList.isEmpty()) {
                qrRepository.getWorkspaces().onSuccess { workspacesList = it }
            }
        } catch (e: Exception) {
            errorMessage = e.message ?: "An error occurred"
        } finally {
            isLoading = false
        }
    }

    // Fetch QR codes when workspace changes OR refreshKey changes (e.g. after saving a new QR)
    LaunchedEffect(isLoggedIn, selectedWorkspaceId, refreshKey) {
        loadQRCodes()
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
    
    val isDark = isSystemInDarkTheme()
    val gradientColors = if (isDark) {
        listOf(
            MaterialTheme.colorScheme.background,
            MaterialTheme.colorScheme.background,
            MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)
        )
    } else {
        listOf(
            Orange50,
            White,
            Orange100.copy(alpha = 0.3f)
        )
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = gradientColors
                )
            )
    ) {
        // Header with Workspace Selector
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "QR Library",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Manage and organize all your QR codes",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                // Workspace Dropdown Button + Refresh
                if (isLoggedIn) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        // Refresh button
                        IconButton(
                            onClick = { scope.launch { loadQRCodes() } }
                        ) {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Refresh",
                                tint = if (isLoading) MaterialTheme.colorScheme.onSurfaceVariant
                                       else MaterialTheme.colorScheme.primary
                            )
                        }
                        
                        Box {
                            Surface(
                                onClick = { expandedWorkspaceDropdown = true },
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.primaryContainer,
                                modifier = Modifier.padding(start = 4.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Group, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = selectedWorkspaceName,
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.widthIn(max = 120.dp)
                                    )
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
                                }
                            }
                            
                            DropdownMenu(
                                expanded = expandedWorkspaceDropdown,
                                onDismissRequest = { expandedWorkspaceDropdown = false }
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
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                    focusedLabelColor = Orange600,
                    unfocusedLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    focusedLeadingIconColor = Orange600,
                    unfocusedLeadingIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    focusedTrailingIconColor = Orange600,
                    unfocusedTrailingIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    focusedBorderColor = Orange600,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                    cursorColor = Orange600
                )
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Filters Row
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilterChip(
                    selected = showFavoritesOnly,
                    onClick = { showFavoritesOnly = !showFavoritesOnly },
                    label = { Text("⭐ Favorites") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Error,
                        selectedLabelColor = White
                    )
                )
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
            
            // Category Row
            Row(
                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                categoryFilters.forEach { category ->
                    FilterChip(
                        selected = selectedCategoryFilter == category,
                        onClick = { selectedCategoryFilter = category },
                        label = { Text(category) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.secondary,
                            selectedLabelColor = MaterialTheme.colorScheme.onSecondary,
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    )
                }
            }
        }
        
        // Content list
        if (!isLoggedIn) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(
                        width = 1.dp,
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = if (isDark) 0.15f else 0.4f)
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
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
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Create an account to save and manage your QR codes across devices",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
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
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = {
                            scope.launch {
                                isLoading = true
                                errorMessage = null
                                val result = qrRepository.getQRCodes(selectedWorkspaceId)
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
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = if (searchQuery.isEmpty()) "No QR codes in this workspace" else "No results found",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
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
                                val result = qrRepository.getQRCodes(selectedWorkspaceId)
                                result.fold(
                                    onSuccess = { qrCodes = it },
                                    onFailure = { }
                                )
                            }
                        },
                        onFavoriteToggle = { _ ->
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
    
    // Advanced QR Code Detail Dialog with Analytics Tab
    selectedQRCode?.let { qrCode ->
        var activeTab by remember { mutableStateOf("info") }
        var isEditingUrl by remember { mutableStateOf(false) }
        var editedUrl by remember { mutableStateOf(qrCode.targetUrl ?: qrCode.content) }
        var isUpdatingUrl by remember { mutableStateOf(false) }
        
        // Analytics variables
        var analyticsData by remember { mutableStateOf<QRAnalytics?>(null) }
        var isLoadingAnalytics by remember { mutableStateOf(false) }
        var analyticsError by remember { mutableStateOf<String?>(null) }
        
        // Fetch analytics when switching tab
        LaunchedEffect(activeTab) {
            if (activeTab == "analytics" && qrCode.isDynamic) {
                isLoadingAnalytics = true
                analyticsError = null
                qrRepository.getQRCodeAnalytics(qrCode.id).fold(
                    onSuccess = {
                        analyticsData = it
                        isLoadingAnalytics = false
                    },
                    onFailure = {
                        analyticsError = it.message ?: "Failed to load analytics"
                        isLoadingAnalytics = false
                    }
                )
            }
        }
        
        AlertDialog(
            onDismissRequest = { selectedQRCode = null },
            modifier = Modifier.fillMaxWidth().heightIn(max = 620.dp),
            title = {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = qrCode.title.ifEmpty { "Untitled" },
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (qrCode.isDynamic) {
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = MaterialTheme.colorScheme.primaryContainer
                            ) {
                                Text(
                                    text = "DYNAMIC",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Tab Row
                    TabRow(
                        selectedTabIndex = if (activeTab == "info") 0 else 1,
                        modifier = Modifier.fillMaxWidth(),
                        containerColor = Color.Transparent,
                        contentColor = Orange600
                    ) {
                        Tab(
                            selected = activeTab == "info",
                            onClick = { activeTab = "info" },
                            text = { Text("Info") }
                        )
                        Tab(
                            selected = activeTab == "analytics",
                            onClick = { 
                                if (qrCode.isDynamic) activeTab = "analytics" 
                                else Toast.makeText(context, "Analytics only for Dynamic Codes", Toast.LENGTH_SHORT).show()
                            },
                            text = { 
                                Text(
                                    text = "Analytics",
                                    color = if (qrCode.isDynamic) Color.Unspecified else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                                ) 
                            },
                            enabled = qrCode.isDynamic
                        )
                    }
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                ) {
                    if (activeTab == "info") {
                        // Info Tab content
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // QR image
                            Box(
                                modifier = Modifier
                                    .size(180.dp)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(if (isDark) Gray800 else White)
                                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = if (isDark) 0.2f else 0.5f), RoundedCornerShape(16.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                val bitmap = remember(qrCode.image, qrCode.content) {
                                    if (qrCode.isDynamic && qrCode.type == "url") {
                                        val fg = qrCode.customization?.foregroundColor?.let { android.graphics.Color.parseColor(it) } ?: android.graphics.Color.BLACK
                                        val bg = qrCode.customization?.backgroundColor?.let { android.graphics.Color.parseColor(it) } ?: android.graphics.Color.WHITE
                                        val eye = qrCode.customization?.eyeStyle ?: "square"
                                        val pattern = qrCode.customization?.patternStyle ?: "square"
                                        QRCodeGenerator.generate(
                                            qrContent = qrCode.content,
                                            qrSize = qrCode.size,
                                            foregroundColor = fg,
                                            backgroundColor = bg,
                                            eyeStyle = eye,
                                            patternStyle = pattern
                                        )
                                    } else if (qrCode.image.isNotEmpty()) {
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
                                        modifier = Modifier.fillMaxSize().padding(12.dp),
                                        contentScale = ContentScale.Fit
                                    )
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Editable Target URL if Dynamic
                            if (qrCode.isDynamic) {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.15f)),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f))
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text(
                                            text = "Redirect Target URL",
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        
                                        if (isEditingUrl) {
                                            OutlinedTextField(
                                                value = editedUrl,
                                                onValueChange = { editedUrl = it },
                                                modifier = Modifier.fillMaxWidth(),
                                                shape = RoundedCornerShape(8.dp),
                                                singleLine = true,
                                                colors = OutlinedTextFieldDefaults.colors(
                                                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                                                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                                                    focusedBorderColor = Orange600,
                                                    unfocusedBorderColor = MaterialTheme.colorScheme.outline
                                                )
                                            )
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Button(
                                                    onClick = {
                                                        if (!editedUrl.startsWith("http")) {
                                                            Toast.makeText(context, "Must include http:// or https://", Toast.LENGTH_SHORT).show()
                                                            return@Button
                                                        }
                                                        isUpdatingUrl = true
                                                        scope.launch {
                                                            val updateRes = qrRepository.updateQRCode(
                                                                qrCode.id, 
                                                                QRCodeUpdateRequest(content = editedUrl)
                                                            )
                                                            updateRes.fold(
                                                                onSuccess = { updatedQr ->
                                                                    selectedQRCode = updatedQr
                                                                    isEditingUrl = false
                                                                    Toast.makeText(context, "URL Updated!", Toast.LENGTH_SHORT).show()
                                                                    // refresh list
                                                                    qrRepository.getQRCodes(selectedWorkspaceId).onSuccess { qrCodes = it }
                                                                },
                                                                onFailure = {
                                                                    Toast.makeText(context, it.message ?: "Failed to update", Toast.LENGTH_SHORT).show()
                                                                }
                                                            )
                                                            isUpdatingUrl = false
                                                        }
                                                    },
                                                    colors = ButtonDefaults.buttonColors(containerColor = Orange600),
                                                    modifier = Modifier.weight(1f),
                                                    shape = RoundedCornerShape(8.dp)
                                                ) {
                                                    if (isUpdatingUrl) CircularProgressIndicator(modifier = Modifier.size(16.dp), color = White)
                                                    else Text("Save")
                                                }
                                                OutlinedButton(
                                                    onClick = { 
                                                        isEditingUrl = false 
                                                        editedUrl = qrCode.targetUrl ?: qrCode.content
                                                    },
                                                    modifier = Modifier.weight(1f),
                                                    shape = RoundedCornerShape(8.dp)
                                                ) {
                                                    Text("Cancel")
                                                }
                                            }
                                        } else {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Text(
                                                    text = qrCode.targetUrl ?: qrCode.content,
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    color = MaterialTheme.colorScheme.onSurface,
                                                    modifier = Modifier.weight(1f),
                                                    maxLines = 2,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                IconButton(onClick = { isEditingUrl = true }) {
                                                    Icon(Icons.Default.Edit, contentDescription = "Edit", tint = Orange600, modifier = Modifier.size(20.dp))
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                // Static Encoded Data
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text(
                                            text = "Encoded Data",
                                            style = MaterialTheme.typography.labelMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = qrCode.content,
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurface,
                                            maxLines = 4,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(12.dp))
                            
                            // Info Grid
                            Row(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Type", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                                    Text(qrCode.type.uppercase(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Scan Count", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                                    Text("${qrCode.scanCount} scans", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(8.dp))
                            
                            Row(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Category", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                                    Text(qrCode.category.uppercase(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Date Created", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                                    Text(qrCode.createdAt.take(10), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    } else {
                        // Analytics Tab content
                        if (isLoadingAnalytics) {
                            Box(
                                modifier = Modifier.fillMaxWidth().height(200.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(color = Orange600)
                            }
                        } else if (analyticsError != null) {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(16.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(analyticsError!!, color = Error, style = MaterialTheme.typography.bodyMedium)
                            }
                        } else if (analyticsData != null) {
                            val data = analyticsData!!
                            val totalScans = data.timeSeries.sumOf { it.count }
                            
                            Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                // Total Scans Metric Card
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.15f))
                                ) {
                                    Column(
                                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text("Total Logged Scans", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                        Text("$totalScans", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                                    }
                                }
                                
                                // Device breakdown
                                AnalyticsBreakdownCard(title = "Scans by Device", items = data.devices, total = totalScans)
                                // Browser breakdown
                                AnalyticsBreakdownCard(title = "Scans by Browser", items = data.browsers, total = totalScans)
                                // Country breakdown
                                AnalyticsBreakdownCard(title = "Scans by Country", items = data.countries, total = totalScans)
                            }
                        } else {
                            Box(
                                modifier = Modifier.fillMaxWidth().height(150.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("No analytics logged for this QR code yet", color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                            }
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
                            val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                            val clip = android.content.ClipData.newPlainText("QR Content", qrCode.content)
                            clipboard.setPrimaryClip(clip)
                            Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Outlined.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Copy Data")
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

@Composable
private fun AnalyticsBreakdownCard(
    title: String,
    items: List<AnalyticsBreakdownItem>,
    total: Int
) {
    val isDark = isSystemInDarkTheme()
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = if (isDark) 0.15f else 0.4f)
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(title, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(8.dp))
            
            if (items.isEmpty()) {
                Text("No logs", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f))
            } else {
                items.forEach { item ->
                    val pct = if (total > 0) item.count.toFloat() / total else 0f
                    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(item._id.ifEmpty { "Unknown" }, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
                            Text("${item.count} (${(pct * 100).toInt()}%)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        // Progress bar
                        LinearProgressIndicator(
                            progress = { pct },
                            modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                            color = Orange600,
                            trackColor = if (isDark) Orange500.copy(alpha = 0.15f) else Orange50
                        )
                    }
                }
            }
        }
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
    val isDark = isSystemInDarkTheme()
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = if (isDark) 0.15f else 0.4f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
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
                        tint = if (isFavorite) Error else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(20.dp)
                    )
                }
                
                IconButton(
                    onClick = onShare,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Share,
                        contentDescription = "Share",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
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
                    .background(if (isDark) Orange500.copy(alpha = 0.15f) else Orange50),
                contentAlignment = Alignment.Center
            ) {
                val bitmap = remember(qrCode.image, qrCode.content) {
                    if (qrCode.isDynamic && qrCode.type == "url") {
                        val fg = qrCode.customization?.foregroundColor?.let { android.graphics.Color.parseColor(it) } ?: android.graphics.Color.BLACK
                        val bg = qrCode.customization?.backgroundColor?.let { android.graphics.Color.parseColor(it) } ?: android.graphics.Color.WHITE
                        val eye = qrCode.customization?.eyeStyle ?: "square"
                        val pattern = qrCode.customization?.patternStyle ?: "square"
                        QRCodeGenerator.generate(
                            qrContent = qrCode.content,
                            qrSize = qrCode.size,
                            foregroundColor = fg,
                            backgroundColor = bg,
                            eyeStyle = eye,
                            patternStyle = pattern
                        )
                    } else if (qrCode.image.isNotEmpty()) {
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
                            .padding(8.dp),
                        contentScale = ContentScale.Fit
                    )
                } else {
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
                color = MaterialTheme.colorScheme.onSurface,
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
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = qrCode.type.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                    )
                }
                
                Spacer(modifier = Modifier.width(4.dp))
                
                // Category badge
                if (qrCode.category != "general") {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant
                    ) {
                        Text(
                            text = qrCode.category.replaceFirstChar { it.uppercase() },
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
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
