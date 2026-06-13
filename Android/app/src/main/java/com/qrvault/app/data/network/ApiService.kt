package com.qrvault.app.data.network

import com.qrvault.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    // Auth endpoints
    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>
    
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>
    
    @GET("api/auth/me")
    suspend fun getCurrentUser(@Header("Authorization") token: String): Response<AuthResponse>
    
    @PUT("api/auth/profile")
    suspend fun updateProfile(
        @Header("Authorization") token: String,
        @Body request: ProfileUpdateRequest
    ): Response<AuthResponse>
    
    @POST("api/auth/change-password")
    suspend fun changePassword(
        @Header("Authorization") token: String,
        @Body request: ChangePasswordRequest
    ): Response<AuthResponse>
    
    // QR Code endpoints
    @GET("api/qr-codes")
    suspend fun getQRCodes(@Header("Authorization") token: String): Response<QRCodeResponse>
    
    @GET("api/qr-codes/{id}")
    suspend fun getQRCode(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): Response<QRCodeResponse>
    
    @POST("api/qr-codes")
    suspend fun createQRCode(
        @Header("Authorization") token: String,
        @Body request: QRCodeRequest
    ): Response<QRCodeResponse>
    
    @PUT("api/qr-codes/{id}")
    suspend fun updateQRCode(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body request: QRCodeUpdateRequest
    ): Response<QRCodeResponse>
    
    @DELETE("api/qr-codes/{id}")
    suspend fun deleteQRCode(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): Response<QRCodeResponse>
    
    @PATCH("api/qr-codes/{id}/favorite")
    suspend fun toggleFavorite(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): Response<QRCodeResponse>
    
    @PATCH("api/qr-codes/{id}/category")
    suspend fun updateCategory(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body request: CategoryUpdateRequest
    ): Response<QRCodeResponse>
    
    // Scan History endpoints
    @GET("api/scan-history")
    suspend fun getScanHistory(@Header("Authorization") token: String): Response<ScanHistoryResponse>
    
    @POST("api/scan-history")
    suspend fun saveScanToHistory(
        @Header("Authorization") token: String,
        @Body request: ScanHistoryRequest
    ): Response<ScanHistoryResponse>
    
    @DELETE("api/scan-history/{id}")
    suspend fun deleteScanFromHistory(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): Response<ScanHistoryResponse>
    
    @DELETE("api/scan-history")
    suspend fun clearScanHistory(@Header("Authorization") token: String): Response<ScanHistoryResponse>
}

// Additional request/response models
data class ProfileUpdateRequest(
    val name: String? = null,
    val email: String? = null
)

data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

data class CategoryUpdateRequest(
    val category: String
)

data class ScanHistoryRequest(
    val content: String,
    val type: String = "unknown"
)

data class ScanHistory(
    @com.google.gson.annotations.SerializedName("_id")
    val id: String = "",
    val content: String = "",
    val type: String = "unknown",
    val scannedAt: String = "",
    val createdAt: String = ""
)

data class ScanHistoryResponse(
    val success: Boolean = false,
    val message: String = "",
    val scans: List<ScanHistory>? = null,
    val scan: ScanHistory? = null,
    val count: Int = 0
)
