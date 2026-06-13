package com.qrvault.app.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.qrvault.app.data.model.*
import com.qrvault.app.data.network.RetrofitClient
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "qrvault_prefs")

class AuthRepository(private val context: Context) {
    
    private val apiService = RetrofitClient.apiService
    
    companion object {
        private val TOKEN_KEY = stringPreferencesKey("auth_token")
        private val USER_ID_KEY = stringPreferencesKey("user_id")
        private val USER_NAME_KEY = stringPreferencesKey("user_name")
        private val USER_EMAIL_KEY = stringPreferencesKey("user_email")
    }
    
    val token: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[TOKEN_KEY]
    }
    
    val userName: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[USER_NAME_KEY]
    }
    
    val userEmail: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[USER_EMAIL_KEY]
    }
    
    suspend fun getToken(): String? {
        return context.dataStore.data.first()[TOKEN_KEY]
    }
    
    suspend fun saveUserData(user: User, token: String) {
        context.dataStore.edit { preferences ->
            preferences[TOKEN_KEY] = token
            preferences[USER_ID_KEY] = user.id
            preferences[USER_NAME_KEY] = user.name
            preferences[USER_EMAIL_KEY] = user.email
        }
    }
    
    suspend fun clearUserData() {
        context.dataStore.edit { preferences ->
            preferences.clear()
        }
    }
    
    suspend fun login(email: String, password: String): Result<User> {
        return try {
            val response = apiService.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body()?.success == true) {
                val authResponse = response.body()!!
                val user = authResponse.user!!.copy(token = authResponse.token)
                saveUserData(user, authResponse.token)
                Result.success(user)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Login failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun register(
        name: String,
        email: String,
        password: String,
        accountType: String,
        subscribeToNewsletter: Boolean,
        agreeToTerms: Boolean
    ): Result<User> {
        return try {
            val response = apiService.register(
                RegisterRequest(
                    name = name,
                    email = email,
                    password = password,
                    accountType = accountType,
                    subscribeToNewsletter = subscribeToNewsletter,
                    agreeToTerms = agreeToTerms
                )
            )
            if (response.isSuccessful && response.body()?.success == true) {
                val authResponse = response.body()!!
                val user = authResponse.user!!.copy(token = authResponse.token)
                saveUserData(user, authResponse.token)
                Result.success(user)
            } else {
                Result.failure(Exception(response.body()?.message ?: "Registration failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun logout() {
        clearUserData()
    }
    
    suspend fun getCurrentUser(): Result<User> {
        return try {
            val token = getToken() ?: return Result.failure(Exception("Not logged in"))
            val response = apiService.getCurrentUser("Bearer $token")
            if (response.isSuccessful && response.body()?.user != null) {
                Result.success(response.body()!!.user!!)
            } else {
                Result.failure(Exception("Failed to get user"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
