package com.qrvault.app.data.model

import com.google.gson.annotations.SerializedName

data class Workspace(
    @SerializedName("_id")
    val id: String = "",
    val name: String = "",
    val ownerId: String = "",
    val role: String = "",
    val createdAt: String = ""
)

data class WorkspaceResponse(
    val success: Boolean = false,
    val message: String = "",
    val workspaces: List<Workspace>? = null,
    val workspace: Workspace? = null
)

data class CreateWorkspaceRequest(
    val name: String
)

data class AddMemberRequest(
    val email: String,
    val role: String = "viewer"
)

data class AnalyticsTimeSeriesItem(
    val _id: String = "",
    val count: Int = 0
)

data class AnalyticsBreakdownItem(
    val _id: String = "",
    val count: Int = 0
)

data class QRAnalytics(
    val timeSeries: List<AnalyticsTimeSeriesItem> = emptyList(),
    val devices: List<AnalyticsBreakdownItem> = emptyList(),
    val os: List<AnalyticsBreakdownItem> = emptyList(),
    val browsers: List<AnalyticsBreakdownItem> = emptyList(),
    val countries: List<AnalyticsBreakdownItem> = emptyList()
)

data class QRAnalyticsResponse(
    val success: Boolean = false,
    val message: String = "",
    val analytics: QRAnalytics? = null
)
