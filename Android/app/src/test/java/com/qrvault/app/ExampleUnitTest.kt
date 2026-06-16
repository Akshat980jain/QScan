package com.qrvault.app

import org.junit.Test
import org.junit.Assert.*
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType

class ExampleUnitTest {
    @Test
    fun addition_isCorrect() {
        assertEquals(4, 2 + 2)
    }

    @Test
    fun testZXingEncoding() {
        try {
            val writer = QRCodeWriter()
            val hints = hashMapOf<EncodeHintType, Any>()
            hints[EncodeHintType.MARGIN] = 0
            hints[EncodeHintType.CHARACTER_SET] = "UTF-8"
            val bitMatrix = writer.encode("hello", BarcodeFormat.QR_CODE, 0, 0, hints)
            println("Matrix size: ${bitMatrix.width}x${bitMatrix.height}")
            assertNotNull(bitMatrix)
            assertTrue(bitMatrix.width > 0)
        } catch (e: Exception) {
            fail("Encoding failed with: ${e.message}")
        }
    }
}

