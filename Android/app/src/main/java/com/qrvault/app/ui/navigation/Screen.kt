package com.qrvault.app.ui.navigation

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Generator : Screen("generator")
    object Library : Screen("library")
    object Scanner : Screen("scanner")
    object Auth : Screen("auth")
    object Settings : Screen("settings")
    object Profile : Screen("profile")
    object ScanHistory : Screen("scan_history")
    object QRDetail : Screen("qr_detail/{qrId}") {
        fun createRoute(qrId: String) = "qr_detail/$qrId"
    }
}
