package com.qrvault.app.util

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.LinearGradient
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import java.util.Hashtable

object QRCodeGenerator {
    fun generate(
        qrContent: String,
        qrSize: Int = 512,
        foregroundColor: Int = android.graphics.Color.BLACK,
        backgroundColor: Int = android.graphics.Color.WHITE,
        eyeStyle: String = "square",
        patternStyle: String = "square",
        isGradient: Boolean = false,
        gradientStart: Int = android.graphics.Color.BLACK,
        gradientEnd: Int = android.graphics.Color.BLACK
    ): Bitmap? {
        return try {
            val hints = Hashtable<EncodeHintType, Any>()
            hints[EncodeHintType.MARGIN] = 0
            hints[EncodeHintType.CHARACTER_SET] = "UTF-8"
            
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(qrContent, BarcodeFormat.QR_CODE, 0, 0, hints)
            
            val count = bitMatrix.width
            val size = qrSize
            val cellSize = size.toFloat() / count
            
            val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            val paint = Paint().apply {
                isAntiAlias = true
                style = Paint.Style.FILL
            }
            
            // Draw background
            paint.color = backgroundColor
            canvas.drawRect(0f, 0f, size.toFloat(), size.toFloat(), paint)
            
            // Setup foreground paint
            val fgPaint = Paint().apply {
                isAntiAlias = true
                style = Paint.Style.FILL
                color = foregroundColor
            }
            
            if (isGradient) {
                val shader = LinearGradient(
                    0f, 0f, size.toFloat(), size.toFloat(),
                    gradientStart, gradientEnd,
                    Shader.TileMode.CLAMP
                )
                fgPaint.shader = shader
            }
            
            // Eye Zones helper
            fun isEyeZone(r: Int, c: Int): Boolean {
                if (r < 7 && c < 7) return true
                if (r < 7 && c >= count - 7) return true
                if (r >= count - 7 && c < 7) return true
                return false
            }
            
            // Draw modules
            for (r in 0 until count) {
                for (c in 0 until count) {
                    if (bitMatrix[c, r]) {
                        if (eyeStyle != "square" && isEyeZone(r, c)) {
                            continue
                        }
                        
                        val x = c * cellSize
                        val y = r * cellSize
                        
                        when (patternStyle) {
                            "dot" -> {
                                canvas.drawCircle(x + cellSize / 2f, y + cellSize / 2f, cellSize * 0.4f, fgPaint)
                            }
                            "line" -> {
                                val rect = RectF(x + 0.5f, y + 0.5f, x + cellSize - 0.5f, y + cellSize - 0.5f)
                                canvas.drawRoundRect(rect, cellSize * 0.25f, cellSize * 0.25f, fgPaint)
                            }
                            else -> {
                                canvas.drawRect(x, y, x + cellSize, y + cellSize, fgPaint)
                            }
                        }
                    }
                }
            }
            
            // Draw custom eyes
            if (eyeStyle != "square") {
                val eyes = listOf(
                    Pair(0, 0),
                    Pair(0, count - 7),
                    Pair(count - 7, 0)
                )
                
                val strokePaint = Paint().apply {
                    isAntiAlias = true
                    style = Paint.Style.STROKE
                    strokeWidth = cellSize
                    color = foregroundColor
                }
                
                val eyeFillPaint = Paint().apply {
                    isAntiAlias = true
                    style = Paint.Style.FILL
                    color = foregroundColor
                }
                
                if (isGradient) {
                    val shader = LinearGradient(
                        0f, 0f, size.toFloat(), size.toFloat(),
                        gradientStart, gradientEnd,
                        Shader.TileMode.CLAMP
                    )
                    strokePaint.shader = shader
                    eyeFillPaint.shader = shader
                }
                
                for (eye in eyes) {
                    val ex = eye.second * cellSize
                    val ey = eye.first * cellSize
                    val w = 7 * cellSize
                    
                    if (eyeStyle == "circle") {
                        canvas.drawCircle(ex + w / 2f, ey + w / 2f, w / 2f - cellSize / 2f, strokePaint)
                        canvas.drawCircle(ex + w / 2f, ey + w / 2f, cellSize * 1.5f, eyeFillPaint)
                    } else if (eyeStyle == "rounded") {
                        val outerRect = RectF(ex + cellSize / 2f, ey + cellSize / 2f, ex + w - cellSize / 2f, ey + w - cellSize / 2f)
                        canvas.drawRoundRect(outerRect, cellSize * 1.6f, cellSize * 1.6f, strokePaint)
                        val innerRect = RectF(ex + cellSize * 2f, ey + cellSize * 2f, ex + cellSize * 5f, ey + cellSize * 5f)
                        canvas.drawRoundRect(innerRect, cellSize * 0.8f, cellSize * 0.8f, eyeFillPaint)
                    }
                }
            }
            
            bitmap
        } catch (e: Exception) {
            android.util.Log.e("QRCodeGenerator", "Render failed", e)
            null
        }
    }
}
