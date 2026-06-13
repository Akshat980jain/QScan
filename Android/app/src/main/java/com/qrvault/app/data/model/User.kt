package com.qrvault.app.data.model

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("_id")
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val qrCodesCount: Int = 0,
    val createdAt: String = "",
    val token: String = ""
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String
)

data class AuthResponse(
    val success: Boolean = false,
    val message: String = "",
    val token: String = "",
    val user: User? = null
)
