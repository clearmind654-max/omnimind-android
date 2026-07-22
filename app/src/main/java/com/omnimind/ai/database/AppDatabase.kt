package com.omnimind.ai.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        SessionEntity::class,
        JobEntity::class,
        ConnectorEntity::class,
        MemoryEntity::class,
        PersonaEntity::class,
        FolderEntity::class,
        LogEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun sessionDao(): SessionDao
    abstract fun jobDao(): JobDao
    abstract fun connectorDao(): ConnectorDao
    abstract fun memoryDao(): MemoryDao
    abstract fun personaDao(): PersonaDao
    abstract fun folderDao(): FolderDao
    abstract fun logDao(): LogDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "omnimind_db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
