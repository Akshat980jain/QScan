package com.qrvault.app

import android.app.Application

class QRVaultApplication : Application() {
    
    companion object {
        lateinit var instance: QRVaultApplication
            private set
    }
    
    override fun onCreate() {
        super.onCreate()
        instance = this
    }
}
