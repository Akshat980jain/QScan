package com.qrvault.app.data.model

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("_id")
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val qrCodesCount: Int = 0,
    val createdAt: String = "",
    val token: String = "",
    val accountType: String = "individual",
    val subscribeToNewsletter: Boolean = false,
    val receiveNotifications: Boolean = true,
    val defaultQRColor: String? = null,
    val defaultQRBgColor: String? = null,
    val defaultQREyeStyle: String? = null,
    val defaultQRPatternStyle: String? = null
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val accountType: String,
    val subscribeToNewsletter: Boolean,
    val agreeToTerms: Boolean
)

data class AuthResponse(
    val success: Boolean = false,
    val message: String = "",
    val token: String = "",
    val user: User? = null
)
