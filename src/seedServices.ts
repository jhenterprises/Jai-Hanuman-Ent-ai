import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';

const servicesList = [
      { name: "Aadhaar", description: "Aadhaar Services", icon: "Fingerprint" },
      { name: "Ayushman Bharat Health Account", description: "Ayushman Bharat Health Account", icon: "HeartPulse" },
      { name: "Ayushman Card", description: "PMJAY Beneficiary Portal", icon: "Activity" },
      { name: "BBMP Tax", description: "BBMP Property Tax", icon: "Building" },
      { name: "Bhoomi Land Records", description: "Karnataka Land Records, Pani, RTC,Stech", icon: "Map" },
      { name: "CSC Portal", description: "Digital Seva Portal", icon: "Globe" },
      { name: "CSC Tickets", description: "CSC Safar Tickets", icon: "Ticket" },
      { name: "E Shram Card", description: "E Shram Card Ministry of Labour & Employment", icon: "Briefcase" },
      { name: "E-Khata", description: "BBMP E-Khata", icon: "FileText" },
      { name: "EPFO Member Login", description: "EPFO Member Portal", icon: "Users" },
      { name: "EPFO Member Passbook", description: "EPFO Passbook Portal", icon: "Book" },
      { name: "Food License", description: "FSSAI Food License", icon: "ShoppingBag" },
      { name: "Gruha Jyothi", description: "Gruha Jyothi Scheme", icon: "Lightbulb" },
      { name: "Gruha Lakshmi", description: "Gruha Lakshmi Scheme", icon: "Home" },
      { name: "HSRP Number Plate", description: "Book My HSRP Plate", icon: "Car" },
      { name: "Income Tax", description: "Income Tax E-Filing", icon: "Landmark" },
      { name: "KMDC Loans", description: "kmdc Online karnataka", icon: "Banknote" },
      { name: "KVS Admission", description: "Kendriya Vidyalaya Admission", icon: "School" },
      { name: "MSME / UDYAM", description: "Udyam Registration", icon: "Briefcase" },
      { name: "NPIC Mapping", description: "NPIC Mapping", icon: "MapPin" },
      { name: "PAN Card", description: "PAN Card Services", icon: "CreditCard" },
      { name: "Passport", description: "Passport Seva", icon: "Plane" },
      { name: "Pseva Kendra", description: "P Seva Kendra", icon: "Store" },
      { name: "Railway Pass", description: "Divyangjan Railway ID", icon: "Train" },
      { name: "Ration Card", description: "Karnataka Ration Card", icon: "CreditCard" },
      { name: "RTE Education", description: "Right to Education Karnataka", icon: "BookOpen" },
      { name: "RTO Services", description: "RTO Services New LL,DL (2 & 4 Wheeler)", icon: "Car" },
      { name: "Seva Sindhu", description: "Karnataka Seva Sindhu", icon: "Globe" },
      { name: "SSP Post Matric", description: "Post Matric Scholarship", icon: "GraduationCap" },
      { name: "SSP Pre Matric", description: "Pre Matric Scholarship", icon: "GraduationCap" },
      { name: "TTD Tirupati", description: "TTD Darshan Booking", icon: "Ticket" },
      { name: "UDID CARD", description: "Swavlamban card", icon: "CreditCard" },
      { name: "Voter ID", description: "Voter ID Services", icon: "UserCheck" }
];

export const seedServicesToFirestore = async () => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            return;
        }

        // Active clean-up of financial services
        const financialIds = ['airtel-payments', 'soul-pay', 'swift-money', 'sun-direct'];
        for (const fid of financialIds) {
            try {
                // Delete directly by ID
                await deleteDoc(doc(db, 'services', fid));
                await deleteDoc(doc(db, 'service_management', fid));
                
                // Query and delete by service_id fields (just in case)
                const q1 = query(collection(db, 'services'), where('service_id', '==', fid));
                const snap1 = await getDocs(q1);
                for (const d of snap1.docs) {
                    await deleteDoc(doc(db, 'services', d.id));
                }

                const q2 = query(collection(db, 'service_management'), where('serviceId', '==', fid));
                const snap2 = await getDocs(q2);
                for (const d of snap2.docs) {
                    await deleteDoc(doc(db, 'service_management', d.id));
                }
            } catch (err: any) {
                if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
                    // Non-admin user cannot delete services; ignore silently
                    break;
                } else {
                    console.warn(`Could not remove financial service ${fid}:`, err);
                }
            }
        }

        // Clean up financial service controls
        const serviceControlKeys = ['mobileRecharge', 'dthRecharge', 'electricityBill', 'aeps', 'dmt'];
        for (const sck of serviceControlKeys) {
            try {
                await deleteDoc(doc(db, 'service_controls', sck));
            } catch (err: any) {
                if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
                    break;
                }
            }
        }

        const snap = await getDocs(collection(db, 'services'));
        
        // Count how many valid/remaining services exist
        const nonFinancialServices = snap.docs.filter(d => {
            const data = d.data();
            const sid = data.service_id || data.serviceId || d.id;
            return !financialIds.includes(sid);
        });

        if (nonFinancialServices.length > 0) {
            return;
        }

        console.log("Seeding services...");
        for (let i = 0; i < servicesList.length; i++) {
            const service = servicesList[i];
            const sid = service.name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
            await addDoc(collection(db, 'services'), {
                service_id: sid,
                name: service.name,
                description: service.description,
                icon: service.icon,
                application_type: 'external',
                category: 'All Services',
                status: 'active',
                enabled: true,
                is_visible: true,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                order: i
            });
        }
        console.log("Seeding complete!");
        window.location.reload();
    } catch (e: any) {
        if (e?.code === 'permission-denied' || e?.message?.includes('insufficient permissions')) {
            return;
        }
        console.warn("Error seeding services:", e);
    }
}

