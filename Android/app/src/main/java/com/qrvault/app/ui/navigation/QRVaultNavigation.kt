package com.qrvault.app.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.*
import com.qrvault.app.data.repository.AuthRepository
import com.qrvault.app.ui.screens.*

data class BottomNavItem(
    val route: String,
    val title: String,
    val selectedIcon: @Composable () -> Unit,
    val unselectedIcon: @Composable () -> Unit
)

@androidx.camera.core.ExperimentalGetImage
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QRVaultNavigation() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val authRepository = remember { AuthRepository(context) }
    
    val isLoggedIn by authRepository.token.collectAsState(initial = null)
    var showAuthDialog by remember { mutableStateOf(false) }
    
    val bottomNavItems = listOf(
        BottomNavItem(
            route = Screen.Home.route,
            title = "Home",
            selectedIcon = { Icon(Icons.Filled.Home, contentDescription = "Home") },
            unselectedIcon = { Icon(Icons.Outlined.Home, contentDescription = "Home") }
        ),
        BottomNavItem(
            route = Screen.Generator.route,
            title = "Generate",
            selectedIcon = { Icon(Icons.Filled.QrCode, contentDescription = "Generate") },
            unselectedIcon = { Icon(Icons.Outlined.QrCode, contentDescription = "Generate") }
        ),
        BottomNavItem(
            route = Screen.Scanner.route,
            title = "Scan",
            selectedIcon = { Icon(Icons.Filled.QrCodeScanner, contentDescription = "Scan") },
            unselectedIcon = { Icon(Icons.Outlined.QrCodeScanner, contentDescription = "Scan") }
        ),
        BottomNavItem(
            route = Screen.Library.route,
            title = "Library",
            selectedIcon = { Icon(Icons.Filled.Folder, contentDescription = "Library") },
            unselectedIcon = { Icon(Icons.Outlined.Folder, contentDescription = "Library") }
        ),
        BottomNavItem(
            route = Screen.ScanHistory.route,
            title = "History",
            selectedIcon = { Icon(Icons.Filled.History, contentDescription = "History") },
            unselectedIcon = { Icon(Icons.Outlined.History, contentDescription = "History") }
        )
    )
    
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    val shouldShowBottomBar = currentDestination?.route in bottomNavItems.map { it.route }
    
    Scaffold(
        bottomBar = {
            if (shouldShowBottomBar) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = MaterialTheme.colorScheme.onSurface
                ) {
                    bottomNavItems.forEach { item ->
                        val selected = currentDestination?.hierarchy?.any { it.route == item.route } == true
                        NavigationBarItem(
                            icon = { if (selected) item.selectedIcon() else item.unselectedIcon() },
                            label = { Text(item.title) },
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(paddingValues),
            enterTransition = {
                fadeIn(animationSpec = tween(300)) + slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    tween(300)
                )
            },
            exitTransition = {
                fadeOut(animationSpec = tween(300)) + slideOutOfContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    tween(300)
                )
            },
            popEnterTransition = {
                fadeIn(animationSpec = tween(300)) + slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.End,
                    tween(300)
                )
            },
            popExitTransition = {
                fadeOut(animationSpec = tween(300)) + slideOutOfContainer(
                    AnimatedContentTransitionScope.SlideDirection.End,
                    tween(300)
                )
            }
        ) {
            composable(Screen.Home.route) {
                HomeScreen(
                    isLoggedIn = isLoggedIn != null,
                    onSignInClick = { showAuthDialog = true },
                    onNavigateToGenerator = { 
                        navController.navigate(Screen.Generator.route)
                    },
                    onNavigateToScanner = {
                        navController.navigate(Screen.Scanner.route)
                    },
                    onNavigateToProfile = {
                        navController.navigate(Screen.Profile.route)
                    }
                )
            }
            
            composable(Screen.Generator.route) {
                GeneratorScreen(
                    isLoggedIn = isLoggedIn != null,
                    onSignInClick = { showAuthDialog = true }
                )
            }
            
            composable(Screen.Library.route) {
                LibraryScreen(
                    isLoggedIn = isLoggedIn != null,
                    onSignInClick = { showAuthDialog = true }
                )
            }
            
            composable(Screen.Scanner.route) {
                ScannerScreen(
                    isLoggedIn = isLoggedIn != null,
                    onScanResult = { _ ->
                        // Handle scanned result
                    },
                    onClose = {
                        navController.popBackStack()
                    },
                    onSignInClick = { showAuthDialog = true }
                )
            }
            
            composable(Screen.Settings.route) {
                SettingsScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onLogout = {
                        // Handle logout
                    }
                )
            }
            
            composable(Screen.Profile.route) {
                ProfileScreen(
                    onLogout = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.ScanHistory.route) {
                ScanHistoryScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
    
    // Auth Dialog
    if (showAuthDialog) {
        AuthDialog(
            onDismiss = { showAuthDialog = false },
            onLoginSuccess = { showAuthDialog = false }
        )
    }
}
