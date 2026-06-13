package com.qrvault.app.data.repository

import android.content.Context
import com.qrvault.app.data.model.*
import com.qrvault.app.data.network.*

class QRCodeRepository(private val context: Context) {
    
    private val apiService = RetrofitClient.apiService
    private val authRepository = AuthRepository(context)
    
    suspend fun getQRCodes(): Result<List<QRCode>> {
        return try {
            val token = authRepository.getToken()
            android.util.Log.d("QRCodeRepository", "getQRCodes called, token present: ${token != null}")
            
            if (token == null) {
                android.util.Log.e("QRCodeRepository", "No token found")
                return Result.failure(Exception("Not logged in"))
            }
            
            android.util.Log.d("QRCodeRepository", "Fetching QR codes...")
            val response = apiService.getQRCodes("Bearer $token")
            android.util.Log.d("QRCodeRepository", "Response code: ${response.code()}")
            android.util.Log.d("QRCodeRepository", "Response successful: ${response.isSuccessful}")
            
            val body = response.body()
            android.util.Log.d("QRCodeRepository", "Response body: success=${body?.success}, qrCodes count=${body?.qrCodes?.size}")
            
            if (response.isSuccessful && body?.qrCodes != null) {
                android.util.Log.d("QRCodeRepository", "Successfully fetched ${body.qrCodes.size} QR codes")
                body.qrCodes.forEachIndexed { index, qr ->
                    android.util.Log.d("QRCodeRepository", "QR[$index]: id=${qr.id}, title=${qr.title}, type=${qr.type}")
                }
                Result.success(body.qrCodes)
            } else {
                val errorMsg = body?.message ?: response.errorBody()?.string() ?: "Failed to fetch QR codes (${response.code()})"
                android.util.Log.e("QRCodeRepository", "Error: $errorMsg")
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            android.util.Log.e("QRCodeRepository", "Exception fetching QR codes", e)
            Result.failure(e)
        }
    }
    
    suspend fun getQRCode(id: String): Result<QRCode> {
        return try {
            val token = authRepository.getToken() ?: return Result.failure(Exception("Not logged in"))
            val response = apiService.getQRCode("Bearer $token", id)
            if (response.isSuccessful && response.body()?.qrCode != null) {
                Result.success(response.body()!!.qrCode!!)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Failed to fetch QR code"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun createQRCode(request: QRCodeRequest): Result<QRCode> {
        return try {
            val token = authRepository.getToken() ?: return Result.failure(Exception("Not logged in"))
            android.util.Log.d("QRCodeRepository", "Creating QR code: name=${request.name}, type=${request.type}, content length=${request.content.length}")
            
            val response = apiService.createQRCode("Bearer $token", request)
            android.util.Log.d("QRCodeRepository", "Response code: ${response.code()}, success: ${response.isSuccessful}")
            
            if (response.isSuccessful && response.body()?.success == true && response.body()?.qrCode != null) {
                android.util.Log.d("QRCodeRepository", "QR code created successfully")
                Result.success(response.body()!!.qrCode!!)
            } else {
                // Try to get error message from response body
                val errorMessage = response.body()?.message 
                    ?: response.errorBody()?.string()?.let { 
                        try {
                            org.json.JSONObject(it).optString("message", "Failed to create QR code")
                        } catch (e: Exception) {
                            it
                        }
                    } 
                    ?: "Failed to create QR code (${response.code()})"
                android.util.Log.e("QRCodeRepository", "Error creating QR code: $errorMessage")
                Result.failure(Exception(errorMessage))
            }
        } catch (e: Exception) {
            android.util.Log.e("QRCodeRepository", "Exception creating QR code", e)
            Result.failure(e)
        }
    }
    
    suspend fun updateQRCode(id: String, request: QRCodeUpdateRequest): Result<QRCode> {
        return try {
            val token = authRepository.getToken() ?: return Result.failure(Exception("Not logged in"))
            val response = apiService.updateQRCode("Bearer $token", id, request)
            if (response.isSuccessful && response.body()?.qrCode != null) {
                Result.success(response.body()!!.qrCode!!)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Failed to update QR code"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun deleteQRCode(id: String): Result<Unit> {
        return try {
            val token = authRepository.getToken() ?: return Result.failure(Exception("Not logged in"))
            val response = apiService.deleteQRCode("Bearer $token", id)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Failed to delete QR code"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun toggleFavorite(id: String): Result<Boolean> {
        return try {
            val token = authRepository.getToken() ?: return Result.failure(Exception("Not logged in"))
            val response = apiService.toggleFavorite("Bearer $token", id)
            if (response.isSuccessful && response.body()?.isFavorite != null) {
                Result.success(response.body()!!.isFavorite!!)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Failed to toggle favorite"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun updateCategory(id: String, category: String): Result<String> {
        return try {
            val token = authRepository.getToken() ?: return Result.failure(Exception("Not logged in"))
            val response = apiService.updateCategory("Bearer $token", id, CategoryUpdateRequest(category))
            if (response.isSuccessful && response.body()?.category != null) {
                Result.success(response.body()!!.category!!)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Failed to update category"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    // Scan History methods
    suspend fun getScanHistory(): Result<List<ScanHistory>> {
        return try {
            val token = authRepository.getToken() ?: return Result.failure(Exception("Not logged in"))
            val response = apiService.getScanHistory("Bearer $token")
            if (response.isSuccessful && response.body()?.scans != null) {
                Result.success(response.body()!!.scans!!)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Failed to fetch scan history"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun saveScanToHistory(content: String, type: String): Result<ScanHistory> {
        return try {
            val token = authRepository.getToken() ?: return Result.failure(Exception("Not logged in"))
            val response = apiService.saveScanToHistory("Bearer $token", ScanHistoryRequest(content, type))
            if (response.isSuccessful && response.body()?.scan != null) {
                Result.success(response.body()!!.scan!!)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Failed to save scan"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun clearScanHistory(): Result<Unit> {
        return try {
            val token = authRepository.getToken() ?: return Result.failure(Exception("Not logged in"))
            val response = apiService.clearScanHistory("Bearer $token")
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Failed to clear history"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
