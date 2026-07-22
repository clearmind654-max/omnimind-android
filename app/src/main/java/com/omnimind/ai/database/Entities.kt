package com.omnimind.ai.database

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sessions")
data class SessionEntity(
    @PrimaryKey val sessionId: String,
    val title: String,
    val folderId: String? = null,
    val personaId: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val activeModel: String = "auto",
    val systemPrompt: String = ""
)

@Entity(tableName = "jobs")
data class JobEntity(
    @PrimaryKey val jobId: String,
    val sessionId: String,
    val actionType: String, // direct, delegate, chain, compare, vision, research
    val payloadJson: String,
    val status: String, // PENDING, RUNNING, COMPLETED, FAILED
    val resultJson: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val completedAt: Long = 0L
)

@Entity(tableName = "connectors")
data class ConnectorEntity(
    @PrimaryKey val connectorId: String,
    val name: String,
    val baseUrl: String,
    val apiKey: String,
    val modelString: String,
    val skillsJson: String, // ["chat", "vision", "image", "video", "research"]
    val isEnabled: Boolean = true,
    val priorityOrder: Int = 0,
    val temperature: Float = 0.7f,
    val topP: Float = 0.9f,
    val maxTokens: Int = 2048
)

@Entity(tableName = "memories")
data class MemoryEntity(
    @PrimaryKey val memoryId: String,
    val category: String, // preference, fact, project_context, user_bio
    val content: String,
    val timestamp: Long = System.currentTimeMillis(),
    val confidence: Float = 1.0f
)

@Entity(tableName = "personas")
data class PersonaEntity(
    @PrimaryKey val personaId: String,
    val name: String,
    val description: String,
    val systemPrompt: String,
    val preferredConnectorId: String = "auto",
    val temperature: Float = 0.7f,
    val isDefault: Boolean = false
)

@Entity(tableName = "folders")
data class FolderEntity(
    @PrimaryKey val folderId: String,
    val name: String,
    val colorHex: String = "#007AFF",
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "logs")
data class LogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val level: String,
    val tag: String,
    val message: String,
    val timestamp: Long = System.currentTimeMillis()
)
