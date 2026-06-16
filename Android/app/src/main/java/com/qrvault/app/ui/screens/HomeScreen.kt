package com.qrvault.app.ui.screens

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.qrvault.app.data.repository.QRCodeRepository
import com.qrvault.app.ui.theme.*
import androidx.compose.ui.res.painterResource
import com.qrvault.app.R
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(
    isLoggedIn: Boolean,
    onSignInClick: () -> Unit,
    onNavigateToGenerator: () -> Unit,
    onNavigateToScanner: () -> Unit,
    onNavigateToProfile: () -> Unit = {}
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    val qrRepository = remember { QRCodeRepository(context) }
    
    var qrCodesCount by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(false) }
    
    // Fetch QR codes count when logged in
    LaunchedEffect(isLoggedIn) {
        if (isLoggedIn) {
            isLoading = true
            val result = qrRepository.getQRCodes()
            result.fold(
                onSuccess = { qrCodesCount = it.size },
                onFailure = { qrCodesCount = 0 }
            )
            isLoading = false
        }
    }
    
    // Refresh count when screen becomes visible (using key to trigger refresh)
    var refreshKey by remember { mutableStateOf(0) }
    LaunchedEffect(refreshKey, isLoggedIn) {
        if (isLoggedIn && refreshKey > 0) {
            val result = qrRepository.getQRCodes()
            result.fold(
                onSuccess = { qrCodesCount = it.size },
                onFailure = { }
            )
        }
    }
    
    // Refresh on every recomposition when screen is visible
    DisposableEffect(Unit) {
        refreshKey++
        onDispose { }
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
            .verticalScroll(scrollState)
    ) {
        // App Header Banner (shows logo, name, and profile or sign-in)
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isDark) MaterialTheme.colorScheme.surface else Gray800
            ),
            border = if (isDark) BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.15f)) else null
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // App Name on the left
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.ic_launcher),
                        contentDescription = null,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "QR Vault",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = White
                    )
                }
                
                if (isLoggedIn) {
                    // Profile button on the right
                    IconButton(
                        onClick = onNavigateToProfile,
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(Orange600)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Person,
                            contentDescription = "Profile",
                            tint = White
                        )
                    }
                } else {
                    // Sign In button on the right
                    Button(
                        onClick = onSignInClick,
                        modifier = Modifier.height(40.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Orange600
                        ),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "Sign In",
                            color = White,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.labelLarge
                        )
                    }
                }
            }
        }
        
        Spacer(modifier = Modifier.height(8.dp))
        
        if (!isLoggedIn) {
            HeroSection(
                onSignInClick = onSignInClick,
                onTryDemoClick = onNavigateToGenerator
            )
        } else {
            WelcomeBackSection(
                qrCodesCount = qrCodesCount,
                isLoading = isLoading
            )
        }
        
        // Quick Actions
        QuickActionsSection(
            onGenerateClick = onNavigateToGenerator,
            onScanClick = onNavigateToScanner
        )
        
        // Recent QR Codes (for authenticated users)
        if (isLoggedIn && qrCodesCount > 0) {
            var recentQRCodes by remember { mutableStateOf<List<com.qrvault.app.data.model.QRCode>>(emptyList()) }
            
            LaunchedEffect(qrCodesCount) {
                val result = qrRepository.getQRCodes()
                result.fold(
                    onSuccess = { recentQRCodes = it.take(5) },
                    onFailure = { }
                )
            }
            
            if (recentQRCodes.isNotEmpty()) {
                RecentQRCodesSection(
                    recentQRCodes = recentQRCodes,
                    onQRCodeClick = { /* Could navigate to detail */ }
                )
            }
        }
        
        // Features Section (for non-authenticated users)
        if (!isLoggedIn) {
            FeaturesSection()
            StatsSection()
        }
        
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun HeroSection(
    onSignInClick: () -> Unit,
    onTryDemoClick: () -> Unit
) {
    val isDark = isSystemInDarkTheme()
    val primaryColor = if (isDark) MaterialTheme.colorScheme.primary else Orange600
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Create, Manage & Share",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center
        )
        
        Text(
            text = "QR Codes Instantly",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            color = primaryColor,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "The most powerful QR code generator with advanced features, secure storage, and seamless collaboration for teams and individuals.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 16.dp)
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = onSignInClick,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = primaryColor
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = "Get Started",
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1
                )
            }
            
            OutlinedButton(
                onClick = onTryDemoClick,
                modifier = Modifier
                    .weight(1f)
                    .height(56.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = primaryColor
                ),
                border = BorderStroke(1.dp, primaryColor),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = "Try Demo",
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1
                )
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun WelcomeBackSection(
    qrCodesCount: Int,
    isLoading: Boolean
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color.Transparent
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(Orange600, Orange500)
                    )
                )
                .padding(24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = "Welcome back! 👋",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = White
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Ready to create your next QR code?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Orange100
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(
                horizontalAlignment = Alignment.End
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(32.dp),
                        color = White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = qrCodesCount.toString(),
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold,
                        color = White
                    )
                }
                Text(
                    text = "QR Codes Created",
                    style = MaterialTheme.typography.bodySmall,
                    color = Orange100,
                    textAlign = TextAlign.End
                )
            }
        }
    }
}

@Composable
private fun QuickActionsSection(
    onGenerateClick: () -> Unit,
    onScanClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
    ) {
        Text(
            text = "Quick Actions",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            QuickActionCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Outlined.QrCode,
                title = "Generate QR",
                subtitle = "Create new QR code",
                onClick = onGenerateClick
            )
            
            QuickActionCard(
                modifier = Modifier.weight(1f),
                icon = Icons.Outlined.QrCodeScanner,
                title = "Scan QR",
                subtitle = "Scan existing code",
                onClick = onScanClick
            )
        }
    }
}

@Composable
private fun QuickActionCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    val isDark = isSystemInDarkTheme()
    val iconBgColor = if (isDark) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f) else Orange100
    val iconTint = if (isDark) MaterialTheme.colorScheme.primary else Orange600

    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(
            1.dp,
            MaterialTheme.colorScheme.outlineVariant.copy(alpha = if (isDark) 0.15f else 0.4f)
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isDark) 0.dp else 4.dp
        ),
        onClick = onClick
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(iconBgColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = iconTint,
                    modifier = Modifier.size(28.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun FeaturesSection() {
    val features = listOf(
        FeatureItem(Icons.Outlined.AutoAwesome, "Smart QR Generation", "Create QR codes for any content type with advanced customization"),
        FeatureItem(Icons.Outlined.Shield, "Secure & Private", "Your data stays on your device with end-to-end encryption"),
        FeatureItem(Icons.Outlined.Group, "Team Collaboration", "Share and manage QR codes with your team seamlessly"),
        FeatureItem(Icons.Outlined.Sync, "Real-time Sync", "Access your QR codes anywhere with cloud synchronization")
    )
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Spacer(modifier = Modifier.height(24.dp))
        
        Text(
            text = "Powerful Features",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        
        features.chunked(2).forEach { rowItems ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                rowItems.forEach { feature ->
                    FeatureCard(
                        modifier = Modifier.weight(1f),
                        feature = feature
                    )
                }
                if (rowItems.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }
    }
}

private data class FeatureItem(
    val icon: ImageVector,
    val title: String,
    val description: String
)

@Composable
private fun FeatureCard(
    modifier: Modifier = Modifier,
    feature: FeatureItem
) {
    val isDark = isSystemInDarkTheme()
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = if (isDark) 0.5f else 0.8f)
        ),
        border = BorderStroke(
            1.dp,
            MaterialTheme.colorScheme.outlineVariant.copy(alpha = if (isDark) 0.1f else 0.3f)
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isDark) 0.dp else 2.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Icon(
                imageVector = feature.icon,
                contentDescription = feature.title,
                tint = if (isDark) MaterialTheme.colorScheme.primary else Orange600,
                modifier = Modifier.size(40.dp)
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(
                text = feature.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = feature.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun StatsSection() {
    val stats = listOf(
        StatItem(Icons.AutoMirrored.Outlined.TrendingUp, "10,000+", "QR Codes Generated"),
        StatItem(Icons.Outlined.People, "5,000+", "Active Users"),
        StatItem(Icons.Outlined.Public, "50+", "Countries")
    )
    val isDark = isSystemInDarkTheme()
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = if (isDark) 0.5f else 0.9f)
        ),
        border = BorderStroke(
            1.dp,
            MaterialTheme.colorScheme.outlineVariant.copy(alpha = if (isDark) 0.15f else 0.4f)
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isDark) 0.dp else 4.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp)
        ) {
            Text(
                text = "Trusted by Thousands",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                stats.forEach { stat ->
                    StatColumn(stat = stat)
                }
            }
        }
    }
}

private data class StatItem(
    val icon: ImageVector,
    val value: String,
    val label: String
)

@Composable
private fun StatColumn(stat: StatItem) {
    val isDark = isSystemInDarkTheme()
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = stat.icon,
            contentDescription = stat.label,
            tint = if (isDark) MaterialTheme.colorScheme.primary else Orange600,
            modifier = Modifier.size(28.dp)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stat.value,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = stat.label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun RecentQRCodesSection(
    recentQRCodes: List<com.qrvault.app.data.model.QRCode>,
    onQRCodeClick: (String) -> Unit
) {
    val isDark = isSystemInDarkTheme()
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Recent QR Codes",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = "View All →",
                style = MaterialTheme.typography.bodyMedium,
                color = if (isDark) MaterialTheme.colorScheme.primary else Orange600
            )
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            recentQRCodes.forEach { qrCode ->
                RecentQRCodeItem(
                    qrCode = qrCode,
                    onClick = { onQRCodeClick(qrCode.id) }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RecentQRCodeItem(
    qrCode: com.qrvault.app.data.model.QRCode,
    onClick: () -> Unit
) {
    val isDark = isSystemInDarkTheme()
    Card(
        onClick = onClick,
        modifier = Modifier.size(100.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(
            1.dp,
            MaterialTheme.colorScheme.outlineVariant.copy(alpha = if (isDark) 0.15f else 0.4f)
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (isDark) 0.dp else 2.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // QR Code thumbnail
            Box(
                modifier = Modifier
                    .size(50.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (isDark) MaterialTheme.colorScheme.surfaceVariant else Orange50),
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
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize().padding(4.dp),
                        contentScale = androidx.compose.ui.layout.ContentScale.Fit
                    )
                } else {
                    Icon(
                        imageVector = Icons.Outlined.QrCode,
                        contentDescription = null,
                        tint = if (isDark) MaterialTheme.colorScheme.primary else Orange600,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = qrCode.title.ifEmpty { "Untitled" },
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
        }
    }
}
