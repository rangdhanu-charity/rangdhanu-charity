const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC_kMUdbOA6wJHbzFldkdazDjOHNSHPSKQ",
  authDomain: "rangdhanu-94e09.firebaseapp.com",
  projectId: "rangdhanu-94e09",
  storageBucket: "rangdhanu-94e09.firebasestorage.app",
  messagingSenderId: "602124994359",
  appId: "1:602124994359:web:db02f78baa27ed70e9bcb2",
  measurementId: "G-KGFHNF50RN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function readExpenses() {
  console.log("Fetching expenses...");
  const snap = await getDocs(collection(db, "expenses"));
  snap.forEach(doc => {
    console.log(`ID: ${doc.id}`);
    console.log(`Title: ${JSON.stringify(doc.data().title)}`);
    console.log(`Notes: ${JSON.stringify(doc.data().notes)}`);
    console.log("-----------------------------------------");
  });
  process.exit(0);
}

readExpenses().catch(err => {
  console.error(err);
  process.exit(1);
});
