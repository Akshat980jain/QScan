package com.qrvault.app.ui.screens

import android.widget.Toast
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.qrvault.app.data.repository.AuthRepository
import com.qrvault.app.data.repository.QRCodeRepository
import com.qrvault.app.data.network.ChangePasswordRequest
import com.qrvault.app.data.network.ProfileUpdateRequest
import com.qrvault.app.data.network.RetrofitClient
import com.qrvault.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val authRepository = remember { AuthRepository(context) }
    val qrRepository = remember { QRCodeRepository(context) }
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    // User data
    var userName by remember { mutableStateOf("") }
    var userEmail by remember { mutableStateOf("") }
    var memberSince by remember { mutableStateOf("") }
    var accountType by remember { mutableStateOf("individual") }
    var isLoading by remember { mutableStateOf(true) }

    // Stats
    var totalQRs by remember { mutableStateOf(0) }
    var dynamicQRs by remember { mutableStateOf(0) }
    var favoriteQRs by remember { mutableStateOf(0) }
    var totalWorkspaces by remember { mutableStateOf(0) }
    var statsLoading by remember { mutableStateOf(true) }

    // Edit Profile Dialog
    var showEditDialog by remember { mutableStateOf(false) }
    var editName by remember { mutableStateOf("") }
    var isUpdating by remember { mutableStateOf(false) }

    // Change Password Dialog
    var showPasswordDialog by remember { mutableStateOf(false) }
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var isChangingPassword by remember { mutableStateOf(false) }

    // Theme Selector Dialog
    var showThemeDialog by remember { mutableStateOf(false) }
    val currentTheme by authRepository.appTheme.collectAsState(initial = "system")

    // Delete account dialog
    var showDeleteDialog by remember { mutableStateOf(false) }

    val isDark = MaterialTheme.colorScheme.primary == md_theme_dark_primary

    // Fetch user info
    LaunchedEffect(Unit) {
        val token = authRepository.getToken()
        if (token != null) {
            try {
                val response = RetrofitClient.apiService.getCurrentUser("Bearer $token")
                if (response.isSuccessful && response.body()?.user != null) {
                    val user = response.body()!!.user!!
                    userName = user.name
                    userEmail = user.email
                    accountType = user.accountType
                    // Format member since date
                    val raw = user.createdAt
                    memberSince = formatDate(raw)
                }
            } catch (_: Exception) {}
        }
        isLoading = false
    }

    // Fetch stats (QR codes + workspaces in parallel)
    LaunchedEffect(Unit) {
        try {
            val qrResult = qrRepository.getQRCodes()
            if (qrResult.isSuccess) {
                val qrs = qrResult.getOrDefault(emptyList())
                totalQRs = qrs.size
                dynamicQRs = qrs.count { it.isDynamic }
                favoriteQRs = qrs.count { it.isFavorite }
            }
            val wsResult = qrRepository.getWorkspaces()
            if (wsResult.isSuccess) {
                totalWorkspaces = wsResult.getOrDefault(emptyList()).size
            }
        } catch (_: Exception) {}
        statsLoading = false
    }

    val gradientColors = if (isDark) {
        listOf(
            MaterialTheme.colorScheme.background,
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        )
    } else {
        listOf(Orange50, White)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = Brush.verticalGradient(colors = gradientColors))
    ) {
        // Top App Bar
        TopAppBar(
            title = { Text("Profile", fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = if (isDark) MaterialTheme.colorScheme.surface else Orange600,
                titleContentColor = if (isDark) MaterialTheme.colorScheme.onSurface else White,
                navigationIconContentColor = if (isDark) MaterialTheme.colorScheme.onSurface else White
            )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(start = 16.dp, end = 16.dp, bottom = 16.dp, top = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            // ── Hero Header Card ──────────────────────────────────────────────
            HeroHeaderCard(
                isDark = isDark,
                userName = userName,
                userEmail = userEmail,
                memberSince = memberSince,
                accountType = accountType,
                isLoading = isLoading,
                onEditClick = {
                    editName = userName
                    showEditDialog = true
                }
            )

            Spacer(modifier = Modifier.height(20.dp))

            // ── Activity Stats Bar ────────────────────────────────────────────
            ActivityStatsRow(
                isDark = isDark,
                totalQRs = totalQRs,
                dynamicQRs = dynamicQRs,
                favoriteQRs = favoriteQRs,
                workspaces = totalWorkspaces,
                isLoading = statsLoading
            )

            Spacer(modifier = Modifier.height(20.dp))

            // ── Account Section ───────────────────────────────────────────────
            ProfileSectionCard(
                title = "Account",
                isDark = isDark
            ) {
                ProfileMenuRow(
                    icon = Icons.Outlined.Person,
                    title = "Edit Profile",
                    subtitle = "Update your name",
                    isDark = isDark,
                    onClick = {
                        editName = userName
                        showEditDialog = true
                    }
                )
                ProfileDivider()
                ProfileMenuRow(
                    icon = Icons.Outlined.Lock,
                    title = "Change Password",
                    subtitle = "Update your password",
                    isDark = isDark,
                    onClick = {
                        currentPassword = ""
                        newPassword = ""
                        confirmPassword = ""
                        showPasswordDialog = true
                    }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Preferences Section ───────────────────────────────────────────
            ProfileSectionCard(
                title = "Preferences",
                isDark = isDark
            ) {
                // Dark Mode row with dialog
                ProfileMenuRow(
                    icon = Icons.Outlined.DarkMode,
                    title = "Appearance",
                    subtitle = when (currentTheme) {
                        "dark" -> "Dark Mode"
                        "light" -> "Light Mode"
                        else -> "System Default"
                    },
                    isDark = isDark,
                    onClick = { showThemeDialog = true }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── About Section ─────────────────────────────────────────────────
            ProfileSectionCard(
                title = "About",
                isDark = isDark
            ) {
                ProfileMenuRow(
                    icon = Icons.Outlined.Info,
                    title = "App Version",
                    subtitle = "QScan v1.0.0",
                    isDark = isDark,
                    showChevron = false,
                    onClick = {}
                )
                ProfileDivider()
                ProfileMenuRow(
                    icon = Icons.Outlined.PrivacyTip,
                    title = "Privacy Policy",
                    subtitle = "How we use your data",
                    isDark = isDark,
                    onClick = {}
                )
                ProfileDivider()
                ProfileMenuRow(
                    icon = Icons.Outlined.Description,
                    title = "Terms of Service",
                    subtitle = "Usage terms and conditions",
                    isDark = isDark,
                    onClick = {}
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Logout Button ─────────────────────────────────────────────────
            Button(
                onClick = {
                    scope.launch {
                        authRepository.clearUserData()
                        onLogout()
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isDark)
                        MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.25f)
                    else
                        MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.15f),
                    contentColor = MaterialTheme.colorScheme.error
                ),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f)),
                shape = RoundedCornerShape(16.dp),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.Logout,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Log Out",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // ── Danger Zone: Delete Account ───────────────────────────────────
            TextButton(
                onClick = { showDeleteDialog = true },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Outlined.DeleteForever,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error.copy(alpha = 0.6f),
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Delete Account",
                    color = MaterialTheme.colorScheme.error.copy(alpha = 0.6f),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    // ── Edit Profile Dialog ───────────────────────────────────────────────────
    if (showEditDialog) {
        AlertDialog(
            onDismissRequest = { showEditDialog = false },
            title = { Text("Edit Profile") },
            text = {
                OutlinedTextField(
                    value = editName,
                    onValueChange = { editName = it },
                    label = { Text("Name") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        isUpdating = true
                        scope.launch {
                            val token = authRepository.getToken()
                            if (token != null) {
                                try {
                                    val response = RetrofitClient.apiService.updateProfile(
                                        "Bearer $token",
                                        ProfileUpdateRequest(name = editName)
                                    )
                                    if (response.isSuccessful) {
                                        userName = editName
                                        Toast.makeText(context, "Profile updated!", Toast.LENGTH_SHORT).show()
                                        showEditDialog = false
                                    } else {
                                        Toast.makeText(context, "Failed to update", Toast.LENGTH_SHORT).show()
                                    }
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                            isUpdating = false
                        }
                    },
                    enabled = !isUpdating && editName.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    if (isUpdating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Save")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showEditDialog = false }) { Text("Cancel") }
            }
        )
    }

    // ── Change Password Dialog ────────────────────────────────────────────────
    if (showPasswordDialog) {
        AlertDialog(
            onDismissRequest = { showPasswordDialog = false },
            title = { Text("Change Password") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = currentPassword,
                        onValueChange = { currentPassword = it },
                        label = { Text("Current Password") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = { newPassword = it },
                        label = { Text("New Password") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it },
                        label = { Text("Confirm New Password") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newPassword != confirmPassword) {
                            Toast.makeText(context, "Passwords don't match", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        if (newPassword.length < 6) {
                            Toast.makeText(context, "Password must be at least 6 characters", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        isChangingPassword = true
                        scope.launch {
                            val token = authRepository.getToken()
                            if (token != null) {
                                try {
                                    val response = RetrofitClient.apiService.changePassword(
                                        "Bearer $token",
                                        ChangePasswordRequest(currentPassword, newPassword)
                                    )
                                    if (response.isSuccessful) {
                                        Toast.makeText(context, "Password changed!", Toast.LENGTH_SHORT).show()
                                        showPasswordDialog = false
                                    } else {
                                        Toast.makeText(context, "Failed to change password", Toast.LENGTH_SHORT).show()
                                    }
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                                }
                            }
                            isChangingPassword = false
                        }
                    },
                    enabled = !isChangingPassword && currentPassword.isNotBlank() && newPassword.isNotBlank() && confirmPassword.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    if (isChangingPassword) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Change")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showPasswordDialog = false }) { Text("Cancel") }
            }
        )
    }

    // ── Theme Selection Dialog ────────────────────────────────────────────────
    if (showThemeDialog) {
        AlertDialog(
            onDismissRequest = { showThemeDialog = false },
            title = { Text("Select Theme") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    val options = listOf(
                        Triple("system", "System Default", Icons.Outlined.SettingsBrightness),
                        Triple("light", "Light Mode", Icons.Outlined.LightMode),
                        Triple("dark", "Dark Mode", Icons.Outlined.DarkMode)
                    )
                    options.forEach { (themeValue, themeLabel, themeIcon) ->
                        val isSelected = currentTheme == themeValue
                        val animatedBg by animateColorAsState(
                            targetValue = if (isSelected)
                                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
                            else
                                Color.Transparent,
                            animationSpec = tween(200)
                        )
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(animatedBg)
                                .clickable {
                                    scope.launch {
                                        authRepository.saveTheme(themeValue)
                                        showThemeDialog = false
                                    }
                                }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = themeIcon,
                                contentDescription = null,
                                tint = if (isSelected) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(22.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = themeLabel,
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                color = if (isSelected) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.onSurface,
                                modifier = Modifier.weight(1f)
                            )
                            if (isSelected) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showThemeDialog = false }) { Text("Close") }
            }
        )
    }

    // ── Delete Account Dialog ─────────────────────────────────────────────────
    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            icon = {
                Icon(
                    imageVector = Icons.Outlined.Warning,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(32.dp)
                )
            },
            title = { Text("Delete Account?", color = MaterialTheme.colorScheme.error) },
            text = {
                Text(
                    "This action is permanent and cannot be undone. All your QR codes, workspaces, and data will be deleted.",
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteDialog = false
                        Toast.makeText(context, "Contact support to delete your account.", Toast.LENGTH_LONG).show()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError
                    )
                ) {
                    Text("Delete Account")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            }
        )
    }
}

// ── Hero Header Card ──────────────────────────────────────────────────────────
@Composable
private fun HeroHeaderCard(
    isDark: Boolean,
    userName: String,
    userEmail: String,
    memberSince: String,
    accountType: String,
    isLoading: Boolean,
    onEditClick: () -> Unit
) {
    val headerGradient = if (isDark) {
        Brush.linearGradient(listOf(Color(0xFF2D1F0E), Color(0xFF1C1917)))
    } else {
        Brush.linearGradient(listOf(Orange600, Orange400))
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(24.dp)),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(0.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(headerGradient)
                .padding(16.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                // Avatar ring
                Box(contentAlignment = Alignment.Center) {
                    // Glow ring
                    Box(
                        modifier = Modifier
                            .size(108.dp)
                            .clip(CircleShape)
                            .background(
                                if (isDark) Orange400.copy(alpha = 0.25f)
                                else White.copy(alpha = 0.3f)
                            )
                    )
                    // Avatar
                    Box(
                        modifier = Modifier
                            .size(96.dp)
                            .clip(CircleShape)
                            .background(
                                if (isDark) Color(0xFF3D2B10) else White.copy(alpha = 0.2f)
                            )
                            .border(2.5.dp, if (isDark) Orange400 else White.copy(alpha = 0.8f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(color = White, strokeWidth = 2.dp, modifier = Modifier.size(28.dp))
                        } else {
                            Text(
                                text = userName.firstOrNull()?.uppercase() ?: "?",
                                fontSize = 38.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isDark) Orange300 else White
                            )
                        }
                    }
                    // Edit pencil badge
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .offset(x = (-4).dp, y = (-4).dp)
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(if (isDark) Orange400 else White)
                            .clickable(onClick = onEditClick),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Edit",
                            tint = if (isDark) Gray900 else Orange600,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = userName.ifEmpty { "Loading…" },
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = if (isDark) Orange100 else White
                )

                Text(
                    text = userEmail.ifEmpty { "" },
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (isDark) Orange200.copy(alpha = 0.8f) else White.copy(alpha = 0.85f)
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Account type badge
                    val badgeLabel = when (accountType.lowercase()) {
                        "business" -> "Business"
                        "enterprise" -> "Enterprise"
                        else -> "Individual"
                    }
                    val badgeBg = if (isDark) Orange600.copy(alpha = 0.5f) else White.copy(alpha = 0.2f)
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(badgeBg)
                            .padding(horizontal = 12.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "✦  $badgeLabel",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isDark) Orange200 else White
                        )
                    }
                    // Member since badge
                    if (memberSince.isNotEmpty()) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(badgeBg)
                                .padding(horizontal = 12.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "Since $memberSince",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Medium,
                                color = if (isDark) Orange200 else White
                            )
                        }
                    }
                }
            }
        }
    }
}

// ── Activity Stats Row ────────────────────────────────────────────────────────
@Composable
private fun ActivityStatsRow(
    isDark: Boolean,
    totalQRs: Int,
    dynamicQRs: Int,
    favoriteQRs: Int,
    workspaces: Int,
    isLoading: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = if (isDark) 0.25f else 0.4f)),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StatItem(label = "QR Codes", value = totalQRs, icon = Icons.Outlined.QrCode2, isDark = isDark, isLoading = isLoading)
            StatDivider(isDark)
            StatItem(label = "Dynamic", value = dynamicQRs, icon = Icons.Outlined.BarChart, isDark = isDark, isLoading = isLoading)
            StatDivider(isDark)
            StatItem(label = "Favorites", value = favoriteQRs, icon = Icons.Outlined.Favorite, isDark = isDark, isLoading = isLoading)
            StatDivider(isDark)
            StatItem(label = "Workspaces", value = workspaces, icon = Icons.Outlined.WorkOutline, isDark = isDark, isLoading = isLoading)
        }
    }
}

@Composable
private fun StatItem(label: String, value: Int, icon: ImageVector, isDark: Boolean, isLoading: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (isDark) Orange400 else Orange600,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.height(4.dp))
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.primary
            )
        } else {
            Text(
                text = value.toString(),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun StatDivider(isDark: Boolean) {
    HorizontalDivider(
        modifier = Modifier
            .height(40.dp)
            .width(1.dp),
        color = MaterialTheme.colorScheme.outline.copy(alpha = if (isDark) 0.2f else 0.3f)
    )
}

// ── Reusable Section Card ─────────────────────────────────────────────────────
@Composable
private fun ProfileSectionCard(
    title: String,
    isDark: Boolean,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = title.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = if (isDark) 0.25f else 0.4f)),
            elevation = CardDefaults.cardElevation(2.dp)
        ) {
            Column(modifier = Modifier.padding(vertical = 4.dp)) {
                content()
            }
        }
    }
}

// ── Profile Menu Row ──────────────────────────────────────────────────────────
@Composable
private fun ProfileMenuRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    isDark: Boolean,
    showChevron: Boolean = true,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        color = MaterialTheme.colorScheme.surface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(11.dp))
                    .background(if (isDark) MaterialTheme.colorScheme.primaryContainer else Orange100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (isDark) MaterialTheme.colorScheme.onPrimaryContainer else Orange600,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (showChevron) {
                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
private fun ProfileDivider() {
    HorizontalDivider(
        modifier = Modifier.padding(horizontal = 16.dp),
        color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
    )
}

// ── Utility ───────────────────────────────────────────────────────────────────
private fun formatDate(raw: String): String {
    return try {
        // raw is ISO 8601 like "2024-03-15T10:00:00.000Z"
        val parts = raw.split("T")[0].split("-")
        val year = parts[0]
        val month = when (parts[1]) {
            "01" -> "Jan"; "02" -> "Feb"; "03" -> "Mar"; "04" -> "Apr"
            "05" -> "May"; "06" -> "Jun"; "07" -> "Jul"; "08" -> "Aug"
            "09" -> "Sep"; "10" -> "Oct"; "11" -> "Nov"; "12" -> "Dec"
            else -> parts[1]
        }
        "$month $year"
    } catch (_: Exception) {
        ""
    }
}
