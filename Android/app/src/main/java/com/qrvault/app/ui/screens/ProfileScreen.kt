package com.qrvault.app.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.qrvault.app.data.repository.AuthRepository
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
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()
    
    var userName by remember { mutableStateOf("") }
    var userEmail by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    
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
    
    // Fetch user info
    LaunchedEffect(Unit) {
        val token = authRepository.getToken()
        if (token != null) {
            try {
                val response = RetrofitClient.apiService.getCurrentUser("Bearer $token")
                if (response.isSuccessful && response.body()?.user != null) {
                    userName = response.body()!!.user!!.name
                    userEmail = response.body()!!.user!!.email
                }
            } catch (e: Exception) {
                // Handle error
            }
        }
        isLoading = false
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Orange50, White)
                )
            )
    ) {
        // Top App Bar
        TopAppBar(
            title = { Text("Profile", fontWeight = FontWeight.Bold) },
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = Orange600,
                titleContentColor = White,
                navigationIconContentColor = White
            )
        )
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))
            
            // Profile Avatar
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .clip(CircleShape)
                    .background(Orange600),
                contentAlignment = Alignment.Center
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = White, strokeWidth = 2.dp)
                } else {
                    Text(
                        text = userName.firstOrNull()?.uppercase() ?: "?",
                        style = MaterialTheme.typography.displayMedium,
                        fontWeight = FontWeight.Bold,
                        color = White
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // User Name
            Text(
                text = userName.ifEmpty { "Loading..." },
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Gray800
            )
            
            // User Email
            Text(
                text = userEmail.ifEmpty { "" },
                style = MaterialTheme.typography.bodyLarge,
                color = Gray600
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Profile Options Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = White),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(modifier = Modifier.padding(8.dp)) {
                    ProfileMenuItem(
                        icon = Icons.Outlined.Person,
                        title = "Edit Profile",
                        subtitle = "Update your name",
                        onClick = {
                            editName = userName
                            showEditDialog = true
                        }
                    )
                    
                    Divider(modifier = Modifier.padding(horizontal = 16.dp))
                    
                    ProfileMenuItem(
                        icon = Icons.Outlined.Lock,
                        title = "Change Password",
                        subtitle = "Update your password",
                        onClick = {
                            currentPassword = ""
                            newPassword = ""
                            confirmPassword = ""
                            showPasswordDialog = true
                        }
                    )
                    
                    Divider(modifier = Modifier.padding(horizontal = 16.dp))
                    
                    ProfileMenuItem(
                        icon = Icons.Outlined.DarkMode,
                        title = "Dark Mode",
                        subtitle = "Toggle dark theme",
                        onClick = {
                            Toast.makeText(context, "Coming soon!", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Logout Button
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
                    containerColor = MaterialTheme.colorScheme.error
                ),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Outlined.Logout, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Logout", style = MaterialTheme.typography.titleMedium)
            }
            
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
    
    // Edit Profile Dialog
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
                    colors = ButtonDefaults.buttonColors(containerColor = Orange600)
                ) {
                    if (isUpdating) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = White, strokeWidth = 2.dp)
                    } else {
                        Text("Save")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showEditDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
    
    // Change Password Dialog
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
                    colors = ButtonDefaults.buttonColors(containerColor = Orange600)
                ) {
                    if (isChangingPassword) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = White, strokeWidth = 2.dp)
                    } else {
                        Text("Change")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showPasswordDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun ProfileMenuItem(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        color = White
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Orange100),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = Orange600
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Gray800
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = Gray500
                )
            }
            
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = Gray400
            )
        }
    }
}
