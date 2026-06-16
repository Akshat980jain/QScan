package com.qrvault.app

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import com.qrvault.app.data.repository.AuthRepository
import com.qrvault.app.ui.navigation.QRVaultNavigation
import com.qrvault.app.ui.theme.QRVaultTheme

@androidx.camera.core.ExperimentalGetImage
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Explicitly clear FLAG_SECURE to ensure screenshots are allowed during development
        window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        
        enableEdgeToEdge()
        setContent {
            val authRepository = remember { AuthRepository(applicationContext) }
            val appTheme by authRepository.appTheme.collectAsState(initial = "system")
            
            val isDark = when (appTheme) {
                "dark" -> true
                "light" -> false
                else -> isSystemInDarkTheme()
            }
            
            QRVaultTheme(darkTheme = isDark) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    QRVaultNavigation()
                }
            }
        }
    }
}
