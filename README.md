# @serverlesshq/nodejs

A Node.js client for working with [ServerlessHQ](https://www.serverlesshq.com).  Use this only if there isn't a premade adapter for the framework you are using.

## Getting Started

1. `npm install --save @serverlesshq/nodejs`
2. Create a client using your secret token from [ServerlessHQ](https://www.serverlesshq.com)
```
import Client from "@serverlesshq/nodejs"
const client = new Client("secret token here")

```
3. Enqueue a job 
```
// this will be useful for viewing analytics about your jobs
const queueName = "anything/you/want"

// the data your job needs to operate, can be any javascript object
const jobPayload = { key: value }

// the callback url to use to handle the job
const callbackUrl = "https://www.yoursite.com/api/queues/queue-name"

await client.enqueue({ queueName, payloadJSON, callbackUrl })
```

4. Handle the callback request and perform the job

```
// depending on the framework you are using this will be different
// but you'll need some way to receive incoming requests to a specific endpoint
app.post('/api/queues/queue-name', (req, res) => {
    const webhookSignature = req.headers['shq-webhook-signature']
    const rawPayload = req.body

    // verify the request is coming from serverlesshq.com
    const jobPayload = client.verifyAndDecrypt(rawPayload, webhookSignature)
    if(!jobPayload) {
        res.status(200).json("{error: 'invalid signature'}")
        return
    }
    // actually do the job using data in jobPayload      
    res.status(200).end()
})

```

## End-to-End Encryption

ServerlessHQ supports encrypting the job payload data so that our servers never have access to potentially sensitive information.  To enable this feature simply set a 32 character encryption key using the environment variable `SHQ_ENCRYPTION_KEY` and the client library will automatically encrypt and decrypt the payload using this key.
