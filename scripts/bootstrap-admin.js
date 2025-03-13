// Bootstrap script to add initial admin user to Firestore
// Run with: node scripts/bootstrap-admin.js your-admin-email@example.com

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function addAdminUser() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('Please provide an email address as an argument');
    console.error('Usage: node scripts/bootstrap-admin.js your-admin-email@example.com');
    process.exit(1);
  }
  
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Invalid email format');
    process.exit(1);
  }
  
  try {
    // Check if the email already exists
    const userEmailsRef = db.collection('userEmails');
    const querySnapshot = await userEmailsRef.where('email', '==', email.toLowerCase()).get();
    
    if (!querySnapshot.empty) {
      console.log(`Email ${email} already exists in the collection. Checking if it's an admin...`);
      
      const doc = querySnapshot.docs[0];
      if (doc.data().type === 'admin') {
        console.log(`${email} is already an admin user`);
        process.exit(0);
      } else {
        console.log(`Updating ${email} to be an admin user`);
        await doc.ref.update({
          type: 'admin',
          updatedAt: new Date().toISOString()
        });
        console.log(`Successfully updated ${email} to admin user`);
      }
    } else {
      // Add the new admin user
      const newAdmin = {
        email: email.toLowerCase(),
        type: 'admin',
        addedAt: new Date().toISOString()
      };
      
      await userEmailsRef.add(newAdmin);
      console.log(`Successfully added ${email} as admin user`);
    }
  } catch (error) {
    console.error('Error adding admin user:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

addAdminUser(); 