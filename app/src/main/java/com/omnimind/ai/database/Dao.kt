package com.omnimind.ai.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface SessionDao {
    @Query("SELECT * FROM sessions ORDER BY updatedAt DESC")
    fun getAllSessionsFlow(): Flow<List<SessionEntity>>

    @Query("SELECT * FROM sessions ORDER BY updatedAt DESC")
    suspend fun getAllSessions(): List<SessionEntity>

    @Query("SELECT * FROM sessions WHERE folderId = :folderId ORDER BY updatedAt DESC")
    suspend fun getSessionsByFolder(folderId: String): List<SessionEntity>

    @Query("SELECT * FROM sessions WHERE sessionId = :sessionId LIMIT 1")
    suspend fun getSessionById(sessionId: String): SessionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: SessionEntity)

    @Query("DELETE FROM sessions WHERE sessionId = :sessionId")
    suspend fun deleteSession(sessionId: String)
}

@Dao
interface JobDao {
    @Query("SELECT * FROM jobs WHERE sessionId = :sessionId ORDER BY createdAt ASC")
    suspend fun getJobsForSession(sessionId: String): List<JobEntity>

    @Query("SELECT * FROM jobs WHERE jobId = :jobId LIMIT 1")
    suspend fun getJobById(jobId: String): JobEntity?

    @Query("SELECT * FROM jobs WHERE status = 'PENDING' OR status = 'RUNNING'")
    suspend fun getActiveJobs(): List<JobEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateJob(job: JobEntity)

    @Query("UPDATE jobs SET status = :status, resultJson = :resultJson, completedAt = :completedAt WHERE jobId = :jobId")
    suspend fun updateJobStatus(jobId: String, status: String, resultJson: String, completedAt: Long = System.currentTimeMillis())

    @Query("DELETE FROM jobs WHERE jobId = :jobId")
    suspend fun deleteJob(jobId: String)
}

@Dao
interface ConnectorDao {
    @Query("SELECT * FROM connectors ORDER BY priorityOrder ASC")
    suspend fun getAllConnectors(): List<ConnectorEntity>

    @Query("SELECT * FROM connectors WHERE isEnabled = 1 ORDER BY priorityOrder ASC")
    suspend fun getEnabledConnectors(): List<ConnectorEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConnector(connector: ConnectorEntity)

    @Query("DELETE FROM connectors WHERE connectorId = :connectorId")
    suspend fun deleteConnector(connectorId: String)
}

@Dao
interface MemoryDao {
    @Query("SELECT * FROM memories ORDER BY timestamp DESC")
    suspend fun getAllMemories(): List<MemoryEntity>

    @Query("SELECT * FROM memories WHERE category = :category ORDER BY timestamp DESC")
    suspend fun getMemoriesByCategory(category: String): List<MemoryEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMemory(memory: MemoryEntity)

    @Query("DELETE FROM memories WHERE memoryId = :memoryId")
    suspend fun deleteMemory(memoryId: String)

    @Query("DELETE FROM memories")
    suspend fun clearAllMemories()
}

@Dao
interface PersonaDao {
    @Query("SELECT * FROM personas ORDER BY name ASC")
    suspend fun getAllPersonas(): List<PersonaEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPersona(persona: PersonaEntity)

    @Query("DELETE FROM personas WHERE personaId = :personaId")
    suspend fun deletePersona(personaId: String)
}

@Dao
interface FolderDao {
    @Query("SELECT * FROM folders ORDER BY name ASC")
    suspend fun getAllFolders(): List<FolderEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFolder(folder: FolderEntity)

    @Query("DELETE FROM folders WHERE folderId = :folderId")
    suspend fun deleteFolder(folderId: String)
}

@Dao
interface LogDao {
    @Query("SELECT * FROM logs ORDER BY id DESC LIMIT 500")
    suspend fun getRecentLogs(): List<LogEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertLog(log: LogEntity)

    @Query("DELETE FROM logs")
    suspend fun clearLogs()
}
