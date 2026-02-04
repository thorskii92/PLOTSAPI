const crypto = require('crypto');
const { buffer } = require('stream/consumers');
require('dotenv').config();

const { SECRET_KEY, SECRET_IV, ENCRYPTION_METHOD } = process.env;

const encrypt = (plainText) => {
    if (!SECRET_KEY || !SECRET_IV || !ENCRYPTION_METHOD) {
        throw new Error('Missing encryption configuration in environment variables');
    }

    const cipher = crypto.createCipheriv(ENCRYPTION_METHOD, SECRET_KEY, SECRET_IV)
    
    cipher.update(plainText, 'utf8')

    return Buffer.from(cipher.final()).toString("base64")
}

const decrypt = (cipherText) => {
    if (!SECRET_KEY || !SECRET_IV || !ENCRYPTION_METHOD) {
        throw new Error('Missing encryption configuration in environment variables');
    }

    const buff = Buffer.from(cipherText, 'base64');
    const decipher = crypto.createDecipheriv(ENCRYPTION_METHOD, SECRET_KEY, SECRET_IV);

    decipher.update(buff, "hex")

    return decipher.final("utf8")
}

module.exports = { encrypt, decrypt };