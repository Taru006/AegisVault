# AegisVault End-to-End Testing Roadmap

Follow this step-by-step guide to verify all the features we have implemented across the backend and frontend.

## 1. Environment Verification

Before testing, ensure both servers are healthy.
- **Backend**: Should be running on `http://localhost:5000` connected to the in-memory MongoDB. 
- **Frontend**: Should be running on `http://localhost:5173`. 

## 2. Authentication & Role-Based UI

> [!NOTE]
> Since we're using a fresh in-memory database, you will need to register new users to test the roles.

**Step A: Register an Admin Account**
1. Navigate to `http://localhost:5173/register`.
2. Create an account (e.g., `admin@test.com`). 
3. *Note:* If your backend automatically assigns the first user as Admin, this user should have the `Admin` role. If not, you may need to temporarily adjust your database or registration logic to assign the `Admin` role.
4. **Verification**: Once logged in, you should see the **Manage Users** button in the top right of the Vault Dashboard. You should also see the File Upload drop zone on the right side.

**Step B: Register a Viewer Account**
1. Log out of the Admin account.
2. Register a second account (e.g., `viewer@test.com`). Ensure this account has the `Viewer` role.
3. **Verification**: Once logged in, the **Manage Users** button should be hidden. In the sidebar where the upload component usually sits, you should see a message stating **Viewer Access Only**.

## 3. Zero-Knowledge File Upload (Encryption)

1. Log back in with the **Admin** account.
2. Drag and drop a sample file (like an image or a text file) into the upload zone, or click to select a file.
3. Click **Encrypt & Upload**.
4. **Verification**: 
   - You should see the button text change to *Encrypting Locally...* and then *Uploading...*.
   - A success toast will appear.
   - The file should now appear as a card in your Vault grid.
5. **Backend Verification**: Check your backend terminal logs. You should see an incoming `POST /api/documents` request. The payload will contain `encryptedData` (a base64 string, NOT raw text) and `encryptedDEK`. 

## 4. File Download (Decryption)

1. On the Dashboard, hover over the file card you just uploaded.
2. Click the **Download** (cloud) icon.
3. **Verification**: 
   - The icon will switch to a loading spinner while the `encryptedData` and `encryptedDEK` are fetched from the server.
   - The browser will execute the `Web Crypto API` decryption locally.
   - A file download will trigger automatically in your browser.
   - Open the downloaded file and verify it exactly matches the original file you uploaded (no corruption, readable content).

## 5. Immutable Hash Chain Audit Log (Backend)

We implemented a cryptographic hash chain for audit logs in the backend. 

1. Ensure you have the `_id` of the file you just uploaded. (You can inspect the network tab in your browser when the dashboard loads to find the `_id` of the document).
2. Open a new terminal or use a tool like Postman / cURL.
3. Make a GET request to the audit log endpoint we created earlier:
   ```bash
   curl http://localhost:5000/api/audit/YOUR_FILE_ID_HERE
   ```
4. **Verification**: 
   - The response should be a JSON object containing `isChainValid: true` and an array of `logs`.
   - Look at the `logs` array. The `currentHash` of the first log should match the `previousHash` of the second log, creating an unbroken cryptographic chain.
   - *Optional:* Manually alter a document in the `AuditLog` collection using a MongoDB viewer. Hitting the endpoint again will return `isChainValid: false`.
