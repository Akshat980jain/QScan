package com.qrvault.app.data.model

import com.google.gson.annotations.SerializedName

data class QRCodeCustomization(
    val foregroundColor: String? = null,
    val backgroundColor: String? = null,
    val eyeStyle: String? = null,
    val patternStyle: String? = null,
    val logoImage: String? = null
)

data class QRCode(
    @SerializedName("_id")
    val id: String = "",
    @SerializedName("name")
    val title: String = "",
    val content: String = "",
    val type: String = "text",
    val image: String = "",  // Base64 encoded QR code image from backend
    val isFavorite: Boolean = false,
    val category: String = "general",
    val size: Int = 256,
    val foregroundColor: String = "#000000",
    val backgroundColor: String = "#FFFFFF",
    val includeMargin: Boolean = true,
    val logo: String? = null,
    val imageUrl: String? = null,
    val userId: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
    val isDynamic: Boolean = false,
    val targetUrl: String? = null,
    val shortId: String? = null,
    val scanCount: Int = 0,
    val workspaceId: String? = null,
    val customization: QRCodeCustomization? = null
)

data class QRCodeRequest(
    val name: String,
    val content: String,
    val type: String = "text",
    val image: String,  // Required: Base64 encoded QR code image
    val category: String = "general",
    val size: Int = 256,
    val foregroundColor: String = "#000000",
    val backgroundColor: String = "#FFFFFF",
    val includeMargin: Boolean = true,
    val logo: String? = null,
    val isDynamic: Boolean = false,
    val targetUrl: String? = null,
    val shortId: String? = null,
    val workspaceId: String? = null,
    val customization: QRCodeCustomization? = null
)

data class QRCodeUpdateRequest(
    val name: String? = null,
    val content: String? = null,
    val type: String? = null,
    val category: String? = null,
    val image: String? = null,
    val workspaceId: String? = null,
    val customization: QRCodeCustomization? = null
)

data class QRCodeResponse(
    val success: Boolean = false,
    val message: String = "",
    val qrCode: QRCode? = null,
    val qrCodes: List<QRCode>? = null,
    val isFavorite: Boolean? = null,
    val category: String? = null
)

enum class QRCodeType(val value: String, val displayName: String) {
    TEXT("text", "Text"),
    URL("url", "URL"),
    EMAIL("email", "Email"),
    PHONE("phone", "Phone"),
    SMS("sms", "SMS"),
    WIFI("wifi", "WiFi"),
    VCARD("vcard", "Contact (vCard)"),
    LOCATION("location", "Location")
}

enum class QRCategory(val value: String, val displayName: String) {
    GENERAL("general", "General"),
    WORK("work", "Work"),
    PERSONAL("personal", "Personal"),
    SOCIAL("social", "Social"),
    OTHER("other", "Other")
}
