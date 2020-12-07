import fetch from 'node-fetch'
import superjson from 'superjson'
import Encryptor from './utils/encryption'
import { sign, verify } from './utils/verification'

const serverlessHQHost = process.env.SHQ_API_HOST || "https://www.serverlesshq.com"
const serverlessHQApiPath = process.env.SHQ_API_PATH || "/api"
const serverlessHQEncryptionSecret = process.env.SHQ_ENCRYPTION_SECRET
const serverlessHQPreviousSecret  = process.env.SHQ_PREVIOUS_SECRET

interface EnqueueArgs {
    functionName: string,
    payloadJSON: Record<any, any>,
    callbackUrl: string
}

interface NackArgs {
    headers: Record<any, any>
    functionName: string,
    payload: string,
    error: string
}

interface NackScheduledTaskArgs { 
    path: string,
    error: string
}

class Client {
    private readonly token;
    private readonly encryptor;

    constructor(token: string) {
        this.token = token;
        if(serverlessHQEncryptionSecret) {
            this.encryptor = new Encryptor(serverlessHQEncryptionSecret, serverlessHQPreviousSecret)        
        }
    }

    async enqueue({ functionName, payloadJSON, callbackUrl }: EnqueueArgs) {
        let payload = superjson.stringify(payloadJSON)
        if(this.encryptor) {
            payload = this.encryptor.encrypt(payload)
        }
        return await this.request(`/function/enqueue`, payload, { 'shq-function': functionName, 'shq-callback': callbackUrl })
    }

    async nack({ functionName, payload, error, headers }: NackArgs) {
        const headersToRemove = ['host','x-forwarded-proto','x-forwarded-for']
        headersToRemove.forEach(headerName => { delete headers[headerName] })
        return await this.request(`/function/nack`, payload, {
            ...headers,
            'shq-function': functionName,
            'shq-error': error,
        })
    }

    async nackScheduledTask({ path, error }: NackScheduledTaskArgs) {
        return await this.request(`/scheduled-task/nack`, '', { 'shq-path': path, 'shq-error': error })
    }

    async request(path: string, body = '', headers = {}) {
        const url = `${serverlessHQHost}${serverlessHQApiPath}${path}`
        const response = await fetch(url, {
            method: "POST",
            body,
            headers: {
                'Content-Type': 'text/plain',
                'shq-token': this.token,
                ...headers
            }
        })
        const json = await response.json()
        return json
    }

    sign(payload: string, secret: string = this.token) {
        return sign(payload, secret)
    }

    decrypt(payload: string): Record<any,any> {
        if(!this.encryptor) {
            return superjson.parse(payload) 
        }
        return superjson.parse(this.encryptor.decrypt(payload))
    }

    verify(input: string, signature: string) {
        return verify(input, this.token, signature)
    }

    verifyAndDecrypt(input: string, signature: string): Record<any,any> | null {
        if(!this.verify(input, signature)) {
            return null
        }
        return this.decrypt(input)
    }
}

export default Client