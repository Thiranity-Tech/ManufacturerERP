import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { 
  collection, addDoc, onSnapshot, doc, setDoc, query, orderBy, serverTimestamp, getDoc, runTransaction 
} from 'firebase/firestore';

const Icons = {
  Dashboard: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>,
  Procurement: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2"/></svg>,
  Warehouse: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>,
  Request: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>,
  Manufacturing: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  FGStorage: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>,
  Dispatch: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>,
  Finance: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  Check: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
  Print: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>,
  Plus: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
  Menu: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>,
  Lock: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
  Mail: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  User: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
};

const UNIT_OPTIONS = ['Piece', 'Kg', 'L', 'Meter', 'Tonne', 'Pack'];

const ALL_ROLES = [
  { id: 'superadmin', label: 'Super Admin (Full Access)', category: 'Executive' },
  { id: 'procurement', label: 'Purchase Lead', category: 'Procurement' },
  { id: 'inventory_mgr', label: 'Inventory Manager', category: 'Depot' },
  { id: 'labour_turning', label: 'Turning Operator (L1)', category: 'Shop Floor' },
  { id: 'labour_teeth', label: 'Teeth Cutting Tech (L2)', category: 'Shop Floor' },
  { id: 'labour_surface', label: 'Finishing Specialist (L3)', category: 'Shop Floor' },
  { id: 'sales', label: 'Sales & Dispatch Lead', category: 'Commercial' },
  { id: 'finance', label: 'Finance Controller', category: 'Accounts' }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const s = localStorage.getItem('erp_active_user');
    return s ? JSON.parse(s) : null;
  });
  const [authMode, setAuthMode] = useState('signin');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'superadmin' });
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stageIntakeInputs, setStageIntakeInputs] = useState({});

  const [showAddProcessModal, setShowAddProcessModal] = useState(false);
  const [newProcessForm, setNewProcessForm] = useState({
    name: '',
    stateOutput: 'Semi Finished',
    assignedLabour: 'labour_turning',
    intakeType: 'AUTO_BOM',
    overheadCostPerUnit: '30',
    materialId: 'mat_steel',
    qtyPerUnit: '1'
  });

  const [materialsCatalog, setMaterialsCatalog] = useState([
    { id: 'mat_steel', name: 'Raw Alloy Steel Rod', unit: 'Kg', isShared: true },
    { id: 'mat_chem', name: 'Hardening Solvent', unit: 'L', isShared: false },
    { id: 'mat_fastener', name: 'Hex Bolts & Fasteners', unit: 'Piece', isShared: true }
  ]);
  const [newMaterialInput, setNewMaterialInput] = useState({ name: '', unit: 'Kg', isShared: false });

  const [inventory, setInventory] = useState({
    mat_steel: 1400,
    mat_chem: 380,
    mat_fastener: 2200,
    fg_prod_a: 54,
    fg_prod_b: 22,
    fg_prod_c: 35
  });

  const [products, setProducts] = useState([
    {
      id: 'prod_a',
      name: 'Product A (Transmission Spur)',
      description: 'Process 1 (Shaping) ➔ Semi Finished ➔ Process 2 (Hardening) ➔ Finished Product',
      price: 1850,
      bom: [
        { materialId: 'mat_steel', materialName: 'Raw Alloy Steel Rod', qtyRequired: 2, unit: 'Kg' },
        { materialId: 'mat_chem', materialName: 'Hardening Solvent', qtyRequired: 1, unit: 'L' }
      ],
      stages: [
        { 
          id: 'pa_s1', 
          name: 'Process 1: Rough Turning', 
          stepNum: 1, 
          stateOutput: 'Semi Finished', 
          assignedLabour: 'labour_turning', 
          intakeType: 'AUTO_BOM',
          materialsNeeded: [{ materialId: 'mat_steel', materialName: 'Raw Alloy Steel Rod', qtyPerUnit: 2, unit: 'Kg' }],
          inputAvailable: 60, 
          completedCount: 0, 
          overheadCostPerUnit: 35 
        },
        { 
          id: 'pa_s2', 
          name: 'Process 2: Thermal Hardening', 
          stepNum: 2, 
          stateOutput: 'Finished Product', 
          assignedLabour: 'labour_teeth', 
          intakeType: 'MANUAL_INTAKE',
          materialsNeeded: [{ materialId: 'mat_chem', materialName: 'Hardening Solvent', unit: 'L' }],
          inputAvailable: 0, 
          completedCount: 0, 
          overheadCostPerUnit: 45 
        }
      ]
    },
    {
      id: 'prod_b',
      name: 'Product B (Bevel Gear Assembly)',
      description: 'Process 1 ➔ Intermediate ➔ Process 2 ➔ Semi Finished ➔ Process 3 ➔ Finished Product',
      price: 2450,
      bom: [
        { materialId: 'mat_steel', materialName: 'Raw Alloy Steel Rod (Shared)', qtyRequired: 3, unit: 'Kg' },
        { materialId: 'mat_fastener', materialName: 'Hex Bolts & Fasteners (Shared)', qtyRequired: 4, unit: 'Piece' }
      ],
      stages: [
        { 
          id: 'pb_s1', 
          name: 'Process 1: Tooth Hobbing', 
          stepNum: 1, 
          stateOutput: 'Intermediate', 
          assignedLabour: 'labour_teeth', 
          intakeType: 'AUTO_BOM',
          materialsNeeded: [{ materialId: 'mat_steel', materialName: 'Raw Alloy Steel Rod', qtyPerUnit: 3, unit: 'Kg' }],
          inputAvailable: 45, 
          completedCount: 0, 
          overheadCostPerUnit: 50 
        },
        { 
          id: 'pb_s2', 
          name: 'Process 2: Spline Broaching', 
          stepNum: 2, 
          stateOutput: 'Semi Finished', 
          assignedLabour: 'labour_turning', 
          intakeType: 'STAGE_OUTPUT_ONLY',
          materialsNeeded: [],
          inputAvailable: 0, 
          completedCount: 0, 
          overheadCostPerUnit: 40 
        },
        { 
          id: 'pb_s3', 
          name: 'Process 3: Superfinishing & Fastening', 
          stepNum: 3, 
          stateOutput: 'Finished Product', 
          assignedLabour: 'labour_surface', 
          intakeType: 'MANUAL_INTAKE',
          materialsNeeded: [{ materialId: 'mat_fastener', materialName: 'Hex Bolts & Fasteners', unit: 'Piece' }],
          inputAvailable: 0, 
          completedCount: 0, 
          overheadCostPerUnit: 30 
        }
      ]
    },
    {
      id: 'prod_c',
      name: 'Product C (Precision Pinion)',
      description: 'Process 1 ➔ Intermediate ➔ Process 2 ➔ Finished Product',
      price: 1350,
      bom: [
        { materialId: 'mat_steel', materialName: 'Raw Alloy Steel Rod (Shared)', qtyRequired: 1.2, unit: 'Kg' },
        { materialId: 'mat_chem', materialName: 'Hardening Solvent', qtyRequired: 0.5, unit: 'L' }
      ],
      stages: [
        { 
          id: 'pc_s1', 
          name: 'Process 1: Precision Grinding', 
          stepNum: 1, 
          stateOutput: 'Intermediate', 
          assignedLabour: 'labour_turning', 
          intakeType: 'AUTO_BOM',
          materialsNeeded: [{ materialId: 'mat_steel', materialName: 'Raw Alloy Steel Rod', qtyPerUnit: 1.2, unit: 'Kg' }],
          inputAvailable: 35, 
          completedCount: 0, 
          overheadCostPerUnit: 30 
        },
        { 
          id: 'pc_s2', 
          name: 'Process 2: Final Inspection Polish', 
          stepNum: 2, 
          stateOutput: 'Finished Product', 
          assignedLabour: 'labour_surface', 
          intakeType: 'STAGE_OUTPUT_ONLY',
          materialsNeeded: [],
          inputAvailable: 0, 
          completedCount: 0, 
          overheadCostPerUnit: 25 
        }
      ]
    }
  ]);
  const [selectedProductId, setSelectedProductId] = useState('prod_a');
  const activeProduct = products.find(p => p.id === selectedProductId) || products[0];

  const [materialRequests, setMaterialRequests] = useState([]);
  const [reqForm, setReqForm] = useState({ productId: 'prod_a', materialId: 'mat_steel', qty: 10 });
  const [procurements, setProcurements] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salesRecords, setSalesRecords] = useState([]);
  const [poForm, setPoForm] = useState({ vendor: '', materialId: 'mat_steel', qty: '', rate: '' });
  const [dispatchCart, setDispatchCart] = useState([]);
  const [customer, setCustomer] = useState('Heavy Machinery Corp');
  const [activeBill, setActiveBill] = useState(null);
  const [stageRunQty, setStageRunQty] = useState('');

  const formatINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  useEffect(() => {
    const unsubInv = onSnapshot(doc(db, 'system_data', 'mega_inventory'), snap => {
      if (snap.exists()) setInventory(snap.data());
      else setDoc(doc(db, 'system_data', 'mega_inventory'), inventory, { merge: true });
    }, err => console.error(err));

    const unsubMat = onSnapshot(doc(db, 'system_data', 'mega_materials'), snap => {
      if (snap.exists() && snap.data().list) setMaterialsCatalog(snap.data().list);
      else setDoc(doc(db, 'system_data', 'mega_materials'), { list: materialsCatalog }, { merge: true });
    }, err => console.error(err));

    const unsubProd = onSnapshot(doc(db, 'system_data', 'mega_products'), snap => {
      if (snap.exists() && snap.data().list) setProducts(snap.data().list);
      else setDoc(doc(db, 'system_data', 'mega_products'), { list: products }, { merge: true });
    }, err => console.error(err));

    const unsubReq = onSnapshot(query(collection(db, 'mega_material_requests'), orderBy('createdAt', 'desc')), s => {
      setMaterialRequests(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error(err));

    const unsubPO = onSnapshot(query(collection(db, 'mega_procurements'), orderBy('createdAt', 'desc')), s => {
      setProcurements(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error(err));

    const unsubExp = onSnapshot(query(collection(db, 'mega_expenses'), orderBy('createdAt', 'desc')), s => {
      setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error(err));

    const unsubSales = onSnapshot(query(collection(db, 'mega_sales'), orderBy('createdAt', 'desc')), s => {
      setSalesRecords(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error(err));

    return () => { unsubInv(); unsubMat(); unsubProd(); unsubReq(); unsubPO(); unsubExp(); unsubSales(); };
  }, []);

  const totalSalesRevenue = salesRecords.reduce((acc, s) => acc + (s.total || 0), 0) + 45500;
  const totalExpenditure = expenses.reduce((acc, e) => acc + (e.amount || 0), 0) + 12400;
  const netOperatingProfit = totalSalesRevenue - totalExpenditure;

  const inventoryValuation = useMemo(() => {
    let raw = 0;
    materialsCatalog.forEach(m => { raw += (inventory[m.id] || 0) * 120; });
    let fg = 0;
    products.forEach(p => { fg += (inventory[`fg_${p.id}`] || 0) * p.price; });
    return raw + fg;
  }, [inventory, materialsCatalog, products]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const email = authForm.email.trim().toLowerCase();

    if (!email.endsWith('@gmail.com')) {
      return setAuthError('Only verified @gmail.com accounts are permitted.');
    }
    if (!authForm.password || authForm.password.length < 4) {
      return setAuthError('Password must contain at least 4 characters.');
    }

    try {
      if (authMode === 'signup') {
        if (!authForm.name.trim()) return setAuthError('Please enter your full name.');
        const userDocRef = doc(db, 'company_users', email);
        const userData = {
          name: authForm.name.trim(),
          email,
          password: authForm.password,
          role: authForm.role,
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, userData, { merge: true });
        localStorage.setItem('erp_active_user', JSON.stringify(userData));
        setCurrentUser(userData);
      } else {
        const userDocRef = doc(db, 'company_users', email);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) {
          return setAuthError('User not registered. Please switch to Create Account.');
        }
        const data = userSnap.data();
        if (data.password !== authForm.password) {
          return setAuthError('Invalid credentials entered.');
        }
        localStorage.setItem('erp_active_user', JSON.stringify(data));
        setCurrentUser(data);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('erp_active_user');
    setCurrentUser(null);
  };

  const handleRaisePO = async (e) => {
    e.preventDefault();
    if (!poForm.vendor || !poForm.qty || !poForm.rate) return alert('Please fill all fields');
    const matObj = materialsCatalog.find(m => m.id === poForm.materialId);
    await addDoc(collection(db, 'mega_procurements'), {
      poNum: `PO-${Date.now().toString().slice(-4)}`,
      vendor: poForm.vendor,
      materialId: poForm.materialId,
      materialName: matObj ? matObj.name : 'Material',
      unit: matObj ? matObj.unit : 'Kg',
      qty: Number(poForm.qty),
      rate: Number(poForm.rate),
      total: Number(poForm.qty) * Number(poForm.rate),
      status: 'In Transit',
      createdAt: serverTimestamp()
    });
    setPoForm({ vendor: '', materialId: materialsCatalog[0]?.id || '', qty: '', rate: '' });
  };

  const handleReceiveMaterial = async (po) => {
    try {
      await runTransaction(db, async (transaction) => {
        const invRef = doc(db, 'system_data', 'mega_inventory');
        const poRef = doc(db, 'mega_procurements', po.id);
        const expRef = doc(collection(db, 'mega_expenses'));

        const invDoc = await transaction.get(invRef);
        const curStock = invDoc.exists() ? (Number(invDoc.data()[po.materialId]) || 0) : 0;

        transaction.update(invRef, { [po.materialId]: curStock + Number(po.qty) });
        transaction.update(poRef, { status: 'Received' });
        transaction.set(expRef, {
          voucher: `VOU-PO-${po.id.slice(-4)}`,
          type: 'Raw Material Intake',
          amount: Number(po.total),
          narration: `Purchased ${po.qty} ${po.unit} of ${po.materialName} from ${po.vendor}`,
          createdAt: serverTimestamp()
        });
      });
    } catch (err) {
      alert(`Transaction Error: ${err.message}`);
    }
  };

  const handleCreateProcessStage = async (e) => {
    e.preventDefault();
    if (!newProcessForm.name.trim()) return alert('Enter process name');

    const nextStepNum = (activeProduct.stages?.length || 0) + 1;
    const stageId = `${activeProduct.id}_s${nextStepNum}_${Date.now().toString().slice(-3)}`;
    const selMat = materialsCatalog.find(m => m.id === newProcessForm.materialId);

    const newStageObj = {
      id: stageId,
      name: newProcessForm.name.trim(),
      stepNum: nextStepNum,
      stateOutput: newProcessForm.stateOutput,
      assignedLabour: newProcessForm.assignedLabour,
      intakeType: newProcessForm.intakeType,
      materialsNeeded: newProcessForm.intakeType === 'STAGE_OUTPUT_ONLY' ? [] : [
        {
          materialId: newProcessForm.materialId,
          materialName: selMat ? selMat.name : 'Material',
          qtyPerUnit: Number(newProcessForm.qtyPerUnit) || 1,
          unit: selMat ? selMat.unit : 'Unit'
        }
      ],
      inputAvailable: 0,
      completedCount: 0,
      overheadCostPerUnit: Number(newProcessForm.overheadCostPerUnit) || 25
    };

    const updatedProducts = products.map(p => {
      if (p.id === activeProduct.id) {
        return { ...p, stages: [...(p.stages || []), newStageObj] };
      }
      return p;
    });

    try {
      await setDoc(doc(db, 'system_data', 'mega_products'), { list: updatedProducts }, { merge: true });
      setShowAddProcessModal(false);
      setNewProcessForm({
        name: '',
        stateOutput: 'Semi Finished',
        assignedLabour: 'labour_turning',
        intakeType: 'AUTO_BOM',
        overheadCostPerUnit: '30',
        materialId: materialsCatalog[0]?.id || 'mat_steel',
        qtyPerUnit: '1'
      });
      alert(`Process Stage "${newStageObj.name}" created successfully!`);
    } catch (err) {
      alert(`Failed to create process: ${err.message}`);
    }
  };

  const handleUpdateStageIntakeType = async (stageId, newType) => {
    const updatedProducts = products.map(p => {
      if (p.id === activeProduct.id) {
        const uStages = p.stages.map(st => {
          if (st.id === stageId) {
            return { ...st, intakeType: newType };
          }
          return st;
        });
        return { ...p, stages: uStages };
      }
      return p;
    });

    try {
      await setDoc(doc(db, 'system_data', 'mega_products'), { list: updatedProducts }, { merge: true });
    } catch (err) {
      alert(`Failed to update intake strategy: ${err.message}`);
    }
  };

  const handleStageManualProcure = async (stageId, materialId, qty) => {
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) return alert('Enter valid quantity');

    try {
      await runTransaction(db, async (transaction) => {
        const invRef = doc(db, 'system_data', 'mega_inventory');
        const prodRef = doc(db, 'system_data', 'mega_products');

        const [invDoc, prodDoc] = await Promise.all([
          transaction.get(invRef),
          transaction.get(prodRef)
        ]);

        if (!invDoc.exists() || !prodDoc.exists()) throw new Error('Data records missing');
        const curStock = Number(invDoc.data()[materialId]) || 0;
        if (curStock < qtyNum) throw new Error(`Insufficient depot stock! Available: ${curStock}`);

        const currentProducts = prodDoc.data().list;
        const updatedProducts = currentProducts.map(p => {
          if (p.id === activeProduct.id) {
            const uStages = p.stages.map(st => {
              if (st.id === stageId) {
                return { ...st, inputAvailable: st.inputAvailable + qtyNum };
              }
              return st;
            });
            return { ...p, stages: uStages };
          }
          return p;
        });

        transaction.update(invRef, { [materialId]: curStock - qtyNum });
        transaction.update(prodRef, { list: updatedProducts });
      });

      setStageIntakeInputs(prev => ({ ...prev, [stageId]: '' }));
      alert(`Successfully allocated ${qtyNum} units into this specific stage buffer!`);
    } catch (err) {
      alert(`Intake Failed: ${err.message}`);
    }
  };

  const handleLabourRequestMaterial = async (e) => {
    e.preventDefault();
    const matObj = materialsCatalog.find(m => m.id === reqForm.materialId);
    const prodObj = products.find(p => p.id === reqForm.productId);
    await addDoc(collection(db, 'mega_material_requests'), {
      reqId: `REQ-${Date.now().toString().slice(-4)}`,
      labourName: currentUser.name || 'Shop Floor Specialist',
      productId: reqForm.productId,
      productName: prodObj ? prodObj.name : 'Product Assembly',
      materialId: reqForm.materialId,
      materialName: matObj ? matObj.name : 'Material',
      unit: matObj ? matObj.unit : 'Kg',
      qtyRequested: Number(reqForm.qty),
      status: 'Pending Approval',
      createdAt: serverTimestamp()
    });
    alert('Material request forwarded to Inventory Manager!');
  };

  const handleApproveMaterialRequest = async (req) => {
    try {
      await runTransaction(db, async (transaction) => {
        const invRef = doc(db, 'system_data', 'mega_inventory');
        const prodRef = doc(db, 'system_data', 'mega_products');
        const reqRef = doc(db, 'mega_material_requests', req.id);

        const [invDoc, prodDoc] = await Promise.all([
          transaction.get(invRef),
          transaction.get(prodRef)
        ]);

        if (!invDoc.exists()) throw new Error('Inventory missing');
        const curStock = Number(invDoc.data()[req.materialId]) || 0;
        if (curStock < req.qtyRequested) {
          throw new Error(`Insufficient depot stock! Available: ${curStock} ${req.unit}`);
        }

        const currentProducts = prodDoc.exists() ? prodDoc.data().list : products;
        const updatedProducts = currentProducts.map(p => {
          if (p.id === req.productId && p.stages.length > 0) {
            const uStages = [...p.stages];
            uStages[0].inputAvailable += req.qtyRequested;
            return { ...p, stages: uStages };
          }
          return p;
        });

        transaction.update(invRef, { [req.materialId]: curStock - req.qtyRequested });
        transaction.update(prodRef, { list: updatedProducts });
        transaction.update(reqRef, { status: 'Approved & Released' });
      });
    } catch (err) {
      alert(`Approval Failed: ${err.message}`);
    }
  };

  const handleRunProcessStage = async (stageIndex, qty) => {
    const count = Number(qty);
    if (!count || count <= 0) return alert('Enter valid completed count');

    try {
      await runTransaction(db, async (transaction) => {
        const invRef = doc(db, 'system_data', 'mega_inventory');
        const prodRef = doc(db, 'system_data', 'mega_products');
        const expRef = doc(collection(db, 'mega_expenses'));

        const [invDoc, prodDoc] = await Promise.all([
          transaction.get(invRef),
          transaction.get(prodRef)
        ]);

        if (!invDoc.exists() || !prodDoc.exists()) throw new Error('Data documents not found');

        const currentProducts = prodDoc.data().list;
        const targetProd = currentProducts.find(p => p.id === activeProduct.id);
        const curStage = targetProd.stages[stageIndex];

        if (curStage.inputAvailable < count) {
          throw new Error(`Insufficient workable buffer! Available: ${curStage.inputAvailable}`);
        }

        const invData = invDoc.data();
        const updatedInv = { ...invData };

        if (curStage.intakeType === 'AUTO_BOM' && curStage.materialsNeeded) {
          for (const item of curStage.materialsNeeded) {
            const needed = (item.qtyPerUnit || 1) * count;
            const available = Number(updatedInv[item.materialId]) || 0;
            if (available < needed) {
              throw new Error(`Auto-BOM Deficit in ${curStage.name}! Needed ${needed} ${item.unit} of ${item.materialName}, available: ${available}`);
            }
            updatedInv[item.materialId] = available - needed;
          }
        }

        const isLastStage = stageIndex === targetProd.stages.length - 1;
        if (isLastStage) {
          const fgKey = `fg_${targetProd.id}`;
          updatedInv[fgKey] = (Number(updatedInv[fgKey]) || 0) + count;
        }

        const updatedProducts = currentProducts.map(p => {
          if (p.id === targetProd.id) {
            const uStages = [...p.stages];
            uStages[stageIndex].inputAvailable -= count;
            uStages[stageIndex].completedCount += count;
            if (!isLastStage) uStages[stageIndex + 1].inputAvailable += count;
            return { ...p, stages: uStages };
          }
          return p;
        });

        transaction.update(invRef, updatedInv);
        transaction.update(prodRef, { list: updatedProducts });
        transaction.set(expRef, {
          voucher: `WAGE-${curStage.id.toUpperCase()}-${Date.now().toString().slice(-4)}`,
          type: 'Labor Overhead',
          amount: count * curStage.overheadCostPerUnit,
          narration: `[${targetProd.name}] ${curStage.name} processed ${count} units`,
          createdAt: serverTimestamp()
        });
      });
      setStageRunQty('');
    } catch (err) {
      alert(`Process Execution Error: ${err.message}`);
    }
  };

  const handleAddCart = (p) => {
    const fgKey = `fg_${p.id}`;
    if ((inventory[fgKey] || 0) <= 0) return alert('Finished Goods inventory exhausted.');
    const exist = dispatchCart.find(c => c.id === p.id);
    if (exist) {
      if (exist.qty + 1 > inventory[fgKey]) return alert('Maximum stock quota reached.');
      setDispatchCart(dispatchCart.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setDispatchCart([...dispatchCart, { id: p.id, name: p.name, price: p.price, fgKey, qty: 1 }]);
    }
  };

  const handleCompleteDispatch = async () => {
    if (dispatchCart.length === 0) return;
    const totalAmount = dispatchCart.reduce((a, b) => a + b.price * b.qty, 0);

    try {
      const invData = {
        invoiceNum: `DISP-${Date.now().toString().slice(-5)}`,
        customer,
        items: dispatchCart,
        total: totalAmount,
        createdAt: serverTimestamp()
      };

      await runTransaction(db, async (transaction) => {
        const invRef = doc(db, 'system_data', 'mega_inventory');
        const saleRef = doc(collection(db, 'mega_sales'));

        const invDoc = await transaction.get(invRef);
        if (!invDoc.exists()) throw new Error('Inventory data not found');

        const currentInv = invDoc.data();
        const updatedInv = { ...currentInv };

        for (const item of dispatchCart) {
          const available = Number(updatedInv[item.fgKey]) || 0;
          if (available < item.qty) {
            throw new Error(`Vault stock deficit for ${item.name}! Available: ${available}`);
          }
          updatedInv[item.fgKey] = available - item.qty;
        }

        transaction.update(invRef, updatedInv);
        transaction.set(saleRef, invData);
      });

      setActiveBill(invData);
      setDispatchCart([]);
    } catch (err) {
      alert(`Dispatch Error: ${err.message}`);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .auth-card { width: 100%; max-width: 440px; background: #ffffff; border: 1px solid #dbeafe; border-radius: 20px; padding: 36px 30px; box-shadow: 0 10px 30px -5px rgba(2, 132, 199, 0.08); }
          .auth-tab-btn { flex: 1; height: 42px; border-radius: 10px; border: none; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
          .auth-input-group { margin-bottom: 16px; }
          .auth-input-group label { display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
          .input-icon-wrap { position: relative; display: flex; align-items: center; }
          .input-icon-wrap .icon { position: absolute; left: 14px; color: #0284c7; }
          .auth-input-box { width: 100%; height: 44px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0 14px 0 42px; color: #0f172a; font-size: 14px; outline: none; }
          .auth-input-box:focus { border-color: #0284c7; background: #ffffff; box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15); }
          .auth-primary-btn { width: 100%; height: 46px; background: #0284c7; color: #ffffff; border: none; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; margin-top: 14px; }
          .auth-primary-btn:hover { background: #0369a1; }
        `}</style>

        <div className="auth-card">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '900', marginBottom: '10px', border: '1px solid #bae6fd' }}>
              M
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Manufacturer ERP</h1>
            <p style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '3px', fontWeight: '600' }}>Executive Work Planner & Operations Suite</p>
          </div>

          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '20px' }}>
            <button 
              type="button" 
              onClick={() => { setAuthMode('signin'); setAuthError(''); }}
              className="auth-tab-btn" 
              style={{ background: authMode === 'signin' ? '#ffffff' : 'transparent', color: authMode === 'signin' ? '#0284c7' : '#64748b', boxShadow: authMode === 'signin' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
            >
              Sign In
            </button>
            <button 
              type="button" 
              onClick={() => { setAuthMode('signup'); setAuthError(''); }}
              className="auth-tab-btn" 
              style={{ background: authMode === 'signup' ? '#ffffff' : 'transparent', color: authMode === 'signup' ? '#0284c7' : '#64748b', boxShadow: authMode === 'signup' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
            >
              Create Account
            </button>
          </div>

          {authError && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '12px', marginBottom: '16px' }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit}>
            {authMode === 'signup' && (
              <div className="auth-input-group">
                <label>Full Name</label>
                <div className="input-icon-wrap">
                  <span className="icon">{Icons.User}</span>
                  <input 
                    className="auth-input-box" 
                    placeholder="e.g. Your Name" 
                    value={authForm.name} 
                    onChange={e => setAuthForm({ ...authForm, name: e.target.value })} 
                    required 
                  />
                </div>
              </div>
            )}

            <div className="auth-input-group">
              <label>Email Address</label>
              <div className="input-icon-wrap">
                <span className="icon">{Icons.Mail}</span>
                <input 
                  type="email" 
                  className="auth-input-box" 
                  placeholder="user@gmail.com" 
                  value={authForm.email} 
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })} 
                  required 
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <div className="input-icon-wrap">
                <span className="icon">{Icons.Lock}</span>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="auth-input-box" 
                  placeholder="••••••••" 
                  value={authForm.password} 
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })} 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {authMode === 'signup' && (
              <div className="auth-input-group">
                <label>Assign Factory / ERP Role</label>
                <select 
                  className="auth-input-box" 
                  value={authForm.role} 
                  onChange={e => setAuthForm({ ...authForm, role: e.target.value })}
                  style={{ paddingLeft: '14px', cursor: 'pointer' }}
                >
                  {ALL_ROLES.map(r => <option key={r.id} value={r.id}>{r.label} ({r.category})</option>)}
                </select>
              </div>
            )}

            <button type="submit" className="auth-primary-btn">
              {authMode === 'signin' ? 'Sign In to Workspace ➔' : 'Register & Enter Workspace ➔'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginTop: '20px' }}>
            Manufacturer ERP Suite • 100% Transaction Consistency
          </p>
        </div>
      </div>
    );
  }

  const userRole = currentUser.role || 'superadmin';
  const isSuper = userRole === 'superadmin';

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard & P&L', icon: Icons.Dashboard, allowed: ['superadmin', 'finance'] },
    { id: 'procurement', label: 'Raw Material Procurement', icon: Icons.Procurement, allowed: ['superadmin', 'procurement'] },
    { id: 'raw_stock', label: 'Inventory Storage (Depot)', icon: Icons.Warehouse, allowed: ['superadmin', 'inventory_mgr'] },
    { id: 'requests', label: 'Material Request & Release', icon: Icons.Request, allowed: ['superadmin', 'inventory_mgr', 'labour_turning', 'labour_teeth', 'labour_surface'] },
    { id: 'manufacturing', label: 'Manufacturing Pipelines', icon: Icons.Manufacturing, allowed: ['superadmin', 'labour_turning', 'labour_teeth', 'labour_surface'] },
    { id: 'fg_stock', label: 'Finished Goods Storage', icon: Icons.FGStorage, allowed: ['superadmin', 'inventory_mgr'] },
    { id: 'pos', label: 'Sales & Dispatch', icon: Icons.Dispatch, allowed: ['superadmin', 'sales'] },
    { id: 'accounting', label: 'Expenses & Account Map', icon: Icons.Finance, allowed: ['superadmin', 'finance'] }
  ];

  const menuItems = allNavItems.filter(item => isSuper || item.allowed.includes(userRole));
  const currentSafeTab = menuItems.some(m => m.id === activeTab) ? activeTab : (menuItems[0]?.id || 'dashboard');

  const isInventoryMgr = isSuper || userRole === 'inventory_mgr';
  const isProcurement = isSuper || userRole === 'procurement';
  const isSales = isSuper || userRole === 'sales';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        .mono-num { font-family: 'JetBrains Mono', monospace; font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }
        .white-card { background: #ffffff; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .stat-card { background: #ffffff; border-radius: 14px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        table { width: 100%; min-width: 600px; border-collapse: separate; border-spacing: 0; }
        table th { padding: 12px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        table td { padding: 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        .enterprise-input { width: 100%; height: 42px; padding: 0 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; font-size: 13px; outline: none; }
        .enterprise-input:focus { border-color: #0284c7; }
        .btn-blue { height: 42px; padding: 0 16px; background: #0284c7; color: #ffffff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap; }
        .btn-blue:hover { background: #0369a1; }
        .btn-outline { height: 42px; padding: 0 14px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; color: #334155; display: inline-flex; align-items: center; justify-content: center; gap: 8px; white-space: nowrap; }
        .btn-outline:hover { background: #f1f5f9; }
        .nav-scroller { display: flex; gap: 6px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 4px; border-radius: 10px; background: #f1f5f9; border: 1px solid #e2e8f0; }
        .nav-scroller::-webkit-scrollbar { display: none; }
        .tab-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .tab-btn.active { background-color: #0284c7; color: #ffffff; }
        .tab-btn.inactive { background-color: transparent; color: #64748b; }

        @media (min-width: 901px) {
          .desktop-shell { display: flex; }
          .desktop-sidebar { width: 280px; height: 100vh; position: sticky; top: 0; background: #ffffff; border-right: 1px solid #e2e8f0; padding: 24px 16px; display: flex; flex-direction: column; justify-content: space-between; }
          .mobile-header { display: none !important; }
          .mobile-tabs-bar { display: none !important; }
        }

        @media (max-width: 900px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header { display: flex !important; }
          .mobile-tabs-bar { display: block !important; margin: 12px 16px 0 16px; }
          .viewport-container { padding: 16px !important; }
          .stats-grid-responsive { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
          .dual-col-responsive { grid-template-columns: 1fr !important; }
          .stack-mobile { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
        }
        @media (max-width: 520px) {
          .stats-grid-responsive { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <header className="mobile-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '15px' }}>
            M
          </div>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Manufacturer ERP</h2>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Role: {currentUser.role}</span>
          </div>
        </div>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="btn-outline" style={{ height: '36px', padding: '0 8px' }}>
          {mobileMenuOpen ? '✕' : Icons.Menu}
        </button>
      </header>

      {mobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, top: '57px', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 60 }} onClick={() => setMobileMenuOpen(false)}>
          <div style={{ background: '#ffffff', width: '80%', maxWidth: '300px', height: '100%', padding: '20px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} onClick={e => e.stopPropagation()}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '14px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{currentUser.name || 'Your Name'}</p>
                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600' }}>{currentUser.role}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {menuItems.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} 
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: 'none', background: currentSafeTab === item.id ? '#e0f2fe' : 'transparent', color: currentSafeTab === item.id ? '#0284c7' : '#475569', fontWeight: currentSafeTab === item.id ? '700' : '600', fontSize: '13px', textAlign: 'left', cursor: 'pointer' }}
                  >
                    {item.icon} <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleLogout} className="btn-outline" style={{ width: '100%', height: '36px', color: '#dc2626', borderColor: '#fecaca', fontSize: '12px' }}>
              Logout
            </button>
          </div>
        </div>
      )}

      <div className="mobile-tabs-bar">
        <nav className="nav-scroller">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`tab-btn ${currentSafeTab === item.id ? 'active' : 'inactive'}`}>
              {item.icon} <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="desktop-shell">
        <aside className="desktop-sidebar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '26px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px' }}>
                M
              </div>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Manufacturer ERP</h2>
                <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>Light Clean SaaS</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {menuItems.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: 'none', background: currentSafeTab === item.id ? '#e0f2fe' : 'transparent', color: currentSafeTab === item.id ? '#0284c7' : '#64748b', fontWeight: currentSafeTab === item.id ? '700' : '600', fontSize: '13px', textAlign: 'left', cursor: 'pointer' }}>
                  {item.icon} <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px' }}>
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{currentUser.name || 'Your Name'}</p>
                <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700' }}>{currentUser.role}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-outline" style={{ width: '100%', height: '36px', fontSize: '12px', color: '#dc2626', borderColor: '#fecaca' }}>
              Logout
            </button>
          </div>
        </aside>

        <main className="viewport-container" style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', minHeight: '100vh' }}>
          
          <div className="stack-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                {menuItems.find(m => m.id === currentSafeTab)?.label}
              </h1>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Role: <strong>{currentUser.role}</strong> • Secure Access Control Matrix</p>
            </div>

            <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700', color: '#0284c7', alignSelf: 'flex-start' }}>
              Oct 08, 2026 • Live Synced
            </div>
          </div>

          {currentSafeTab === 'dashboard' && (
            <div>
              <div className="stats-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Gross Revenue</span>
                  <h3 className="mono-num" style={{ fontSize: '22px', fontWeight: '800', margin: '6px 0 2px', color: '#0284c7' }}>{formatINR(totalSalesRevenue)}</h3>
                  <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700' }}>↗ +10.5% Orders Active</span>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #16a34a' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Finished Goods Vault</span>
                  <h3 className="mono-num" style={{ fontSize: '22px', fontWeight: '800', margin: '6px 0 2px', color: '#16a34a' }}>{formatINR(inventoryValuation)}</h3>
                  <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700' }}>Asset Valuation Active</span>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Operating Expenditure</span>
                  <h3 className="mono-num" style={{ fontSize: '22px', fontWeight: '800', margin: '6px 0 2px', color: '#dc2626' }}>{formatINR(totalExpenditure)}</h3>
                  <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: '700' }}>Labor & Material Outlay</span>
                </div>
                <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Net Operating Margin</span>
                  <h3 className="mono-num" style={{ fontSize: '22px', fontWeight: '800', margin: '6px 0 2px', color: '#0f172a' }}>{formatINR(netOperatingProfit)}</h3>
                  <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700' }}>Positive Trajectory</span>
                </div>
              </div>

              <div className="dual-col-responsive" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="white-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Production & Sales Overview</h3>
                      <p style={{ fontSize: '11px', color: '#64748b' }}>Curved Volume vs Net Profit Trajectory</p>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7' }}>Year 2026</span>
                  </div>
                  <div style={{ height: '160px', position: 'relative' }}>
                    <svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none">
                      <path d="M0,130 Q120,20 250,40 T500,120" fill="none" stroke="#0284c7" strokeWidth="3" />
                      <path d="M0,140 Q130,50 250,70 T500,130" fill="none" stroke="#16a34a" strokeWidth="2.5" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: '10px' }}>
                    <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
                  </div>
                </div>

                <div className="white-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', alignSelf: 'flex-start', marginBottom: '12px' }}>Operational Capacity</h3>
                  <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="120" height="120">
                      <circle cx="60" cy="60" r="48" stroke="#e2e8f0" strokeWidth="10" fill="none" />
                      <circle cx="60" cy="60" r="48" stroke="#0284c7" strokeWidth="10" strokeDasharray="301" strokeDashoffset="30" strokeLinecap="round" fill="none" />
                    </svg>
                    <div style={{ position: 'absolute', textAlign: 'center' }}>
                      <span className="mono-num" style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>90%</span>
                      <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>Capacity</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px', fontSize: '10px' }}>
                    <span style={{ color: '#0284c7', fontWeight: '700' }}>● Completed 70%</span>
                    <span style={{ color: '#16a34a', fontWeight: '700' }}>● Dispatched 20%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentSafeTab === 'procurement' && (
            <div style={{ display: 'grid', gap: '18px' }}>
              {isProcurement && (
                <div className="white-card">
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>Raise Purchase Order from Vendors</h3>
                  <form onSubmit={handleRaisePO} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', alignItems: 'end' }}>
                    <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Vendor Name</label><input className="enterprise-input" placeholder="e.g. Acme Metallurgy" value={poForm.vendor} onChange={e => setPoForm({ ...poForm, vendor: e.target.value })} required /></div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Material & Unit</label>
                      <select className="enterprise-input" value={poForm.materialId} onChange={e => setPoForm({ ...poForm, materialId: e.target.value })}>
                        {materialsCatalog.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit}) {m.isShared ? '⭐ Shared Part' : ''}</option>)}
                      </select>
                    </div>
                    <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Intake Quantity</label><input type="number" className="enterprise-input mono-num" value={poForm.qty} onChange={e => setPoForm({ ...poForm, qty: e.target.value })} required /></div>
                    <div><label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Rate (₹)</label><input type="number" className="enterprise-input mono-num" value={poForm.rate} onChange={e => setPoForm({ ...poForm, rate: e.target.value })} required /></div>
                    <button type="submit" className="btn-blue">{Icons.Procurement} Raise PO</button>
                  </form>
                </div>
              )}

              <div className="white-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}><h3 style={{ fontSize: '14px', fontWeight: '700' }}>Inbound Procurement Log</h3></div>
                <div className="table-responsive">
                  <table>
                    <thead><tr><th>PO ID</th><th>Vendor</th><th>Material</th><th>Qty & Unit</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {procurements.map(p => (
                        <tr key={p.id}>
                          <td className="mono-num" style={{ fontWeight: '700', color: '#0284c7' }}>{p.poNum}</td>
                          <td>{p.vendor}</td>
                          <td>{p.materialName}</td>
                          <td className="mono-num">{p.qty} {p.unit}</td>
                          <td className="mono-num">{formatINR(p.total)}</td>
                          <td><span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: p.status === 'Received' ? '#dcfce7' : '#fef3c7', color: p.status === 'Received' ? '#16a34a' : '#d97706', fontWeight: '700' }}>{p.status}</span></td>
                          <td>{p.status === 'In Transit' && isInventoryMgr && <button onClick={() => handleReceiveMaterial(p)} className="btn-blue" style={{ height: '30px', fontSize: '11px', background: '#16a34a' }}>{Icons.Check} Store in Depot</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentSafeTab === 'raw_stock' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                {materialsCatalog.map(m => (
                  <div key={m.id} className="white-card" style={{ borderTop: '3px solid #0284c7' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>{m.name}</span>
                      <span style={{ fontSize: '10px', background: m.isShared ? '#fef3c7' : '#e0f2fe', color: m.isShared ? '#d97706' : '#0284c7', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        {m.isShared ? 'Shared Part' : m.unit}
                      </span>
                    </div>
                    <div className="mono-num" style={{ fontSize: '26px', fontWeight: '800', margin: '8px 0 2px', color: (inventory[m.id] || 0) < 50 ? '#dc2626' : '#0f172a' }}>
                      {inventory[m.id] || 0} <span style={{ fontSize: '12px', color: '#64748b' }}>{m.unit}</span>
                    </div>
                    <p style={{ fontSize: '10px', color: '#64748b' }}>Raw Material Inventory</p>
                  </div>
                ))}
              </div>

              {isInventoryMgr && (
                <div className="white-card">
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>Register New Spec into Depot</h3>
                  <div className="stack-mobile" style={{ display: 'flex', gap: '8px', maxWidth: '640px' }}>
                    <input className="enterprise-input" placeholder="e.g. Copper Bushing" value={newMaterialInput.name} onChange={e => setNewMaterialInput({ ...newMaterialInput, name: e.target.value })} style={{ flex: 2 }} />
                    <select className="enterprise-input" value={newMaterialInput.unit} onChange={e => setNewMaterialInput({ ...newMaterialInput, unit: e.target.value })} style={{ flex: 1 }}>
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button onClick={async () => {
                      if (!newMaterialInput.name.trim()) return;
                      const newEntry = { id: `mat_${Date.now()}`, name: newMaterialInput.name.trim(), unit: newMaterialInput.unit, isShared: newMaterialInput.isShared };
                      const u = [...materialsCatalog, newEntry];
                      setMaterialsCatalog(u);
                      await setDoc(doc(db, 'system_data', 'mega_materials'), { list: u }, { merge: true });
                      setNewMaterialInput({ name: '', unit: 'Kg', isShared: false });
                    }} className="btn-outline">{Icons.Plus} Save Spec</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentSafeTab === 'requests' && (
            <div style={{ display: 'grid', gap: '18px' }}>
              <div className="white-card">
                <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Labour Material Request (To Start Job)</h3>
                <form onSubmit={handleLabourRequestMaterial} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Target Product</label>
                    <select className="enterprise-input" value={reqForm.productId} onChange={e => setReqForm({ ...reqForm, productId: e.target.value })}>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Material Needed</label>
                    <select className="enterprise-input" value={reqForm.materialId} onChange={e => setReqForm({ ...reqForm, materialId: e.target.value })}>
                      {materialsCatalog.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Qty Needed</label>
                    <input type="number" className="enterprise-input mono-num" value={reqForm.qty} onChange={e => setReqForm({ ...reqForm, qty: e.target.value })} required />
                  </div>
                  <button type="submit" className="btn-blue">{Icons.Request} Dispatch Request</button>
                </form>
              </div>

              <div className="white-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Material Request & Manager Approval Feed</h3>
                </div>
                <div className="table-responsive">
                  <table>
                    <thead><tr><th>Req ID</th><th>Labour</th><th>For Product</th><th>Material Needed</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {materialRequests.map(r => (
                        <tr key={r.id}>
                          <td className="mono-num" style={{ fontWeight: '700', color: '#0284c7' }}>{r.reqId}</td>
                          <td><strong>{r.labourName}</strong></td>
                          <td>{r.productName}</td>
                          <td className="mono-num">{r.qtyRequested} {r.unit} of {r.materialName}</td>
                          <td><span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: r.status.includes('Approved') ? '#dcfce7' : '#fef3c7', color: r.status.includes('Approved') ? '#16a34a' : '#d97706', fontWeight: '700' }}>{r.status}</span></td>
                          <td>
                            {r.status === 'Pending Approval' && isInventoryMgr && (
                              <button onClick={() => handleApproveMaterialRequest(r)} className="btn-blue" style={{ height: '30px', fontSize: '11px', background: '#16a34a' }}>
                                {Icons.Check} Issue Buffer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentSafeTab === 'manufacturing' && (
            <div>
              <div className="stack-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', flex: 1, overflowX: 'auto' }}>
                  {(products || []).map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => setSelectedProductId(p.id)}
                      className="btn-outline"
                      style={{
                        background: selectedProductId === p.id ? '#0284c7' : '#ffffff',
                        color: selectedProductId === p.id ? '#ffffff' : '#0f172a',
                        borderColor: selectedProductId === p.id ? '#0284c7' : '#cbd5e1',
                        fontWeight: '700',
                        fontSize: '12px'
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                {isSuper && (
                  <button 
                    onClick={() => setShowAddProcessModal(true)} 
                    className="btn-blue"
                    style={{ background: '#16a34a', whiteSpace: 'nowrap', fontSize: '13px', height: '42px', fontWeight: '700', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)' }}
                  >
                    {Icons.Plus} Add New Process Stage
                  </button>
                )}
              </div>

              {activeProduct ? (
                <>
                  <div className="white-card" style={{ marginBottom: '18px' }}>
                    <div className="stack-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '800' }}>{activeProduct.name}</h3>
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{activeProduct.description}</p>
                      </div>
                      <span className="mono-num" style={{ fontSize: '16px', fontWeight: '800', color: '#0284c7' }}>₹{activeProduct.price} / Unit</span>
                    </div>

                    <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        Standard Bill of Materials (BOM):
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {(activeProduct.bom || []).map((b, i) => (
                          <div key={i} style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                            <strong className="mono-num" style={{ color: '#0284c7' }}>{b.qtyRequired} {b.unit}</strong> of {b.materialName}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '14px' }}>
                    {(activeProduct.stages && activeProduct.stages.length > 0) ? (
                      activeProduct.stages.map((stage, idx) => {
                        const isLast = idx === activeProduct.stages.length - 1;
                        const canOperate = isSuper || currentUser.role === stage.assignedLabour;

                        return (
                          <div key={stage.id} className="white-card" style={{ borderTop: '4px solid #0284c7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: '#0284c7' }}>STAGE 0{stage.stepNum || idx + 1}</span>
                                <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>{stage.assignedLabour}</span>
                              </div>
                              
                              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>{stage.name}</h4>
                              <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '10px' }}>Output State: <strong>{stage.stateOutput || 'Intermediate'}</strong></span>

                              <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', background: stage.intakeType === 'AUTO_BOM' ? '#f0f9ff' : stage.intakeType === 'MANUAL_INTAKE' ? '#fefce8' : '#f8fafc', border: `1px solid ${stage.intakeType === 'AUTO_BOM' ? '#bae6fd' : stage.intakeType === 'MANUAL_INTAKE' ? '#fef08a' : '#e2e8f0'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#0f172a' }}>Intake Strategy:</span>
                                  {isSuper ? (
                                    <select 
                                      value={stage.intakeType || 'AUTO_BOM'} 
                                      onChange={e => handleUpdateStageIntakeType(stage.id, e.target.value)}
                                      style={{ fontSize: '12px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', border: '1px solid #0284c7', background: '#ffffff', color: '#0284c7', outline: 'none', cursor: 'pointer' }}
                                    >
                                      <option value="AUTO_BOM">⚡ Auto-BOM Fetch</option>
                                      <option value="MANUAL_INTAKE">📦 Manual Intake</option>
                                      <option value="STAGE_OUTPUT_ONLY">🔄 Output Only</option>
                                    </select>
                                  ) : (
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: stage.intakeType === 'AUTO_BOM' ? '#0369a1' : stage.intakeType === 'MANUAL_INTAKE' ? '#a16207' : '#64748b' }}>
                                      {stage.intakeType === 'AUTO_BOM' ? '⚡ Auto-BOM' : stage.intakeType === 'MANUAL_INTAKE' ? '📦 Manual Intake' : '🔄 Output Only'}
                                    </span>
                                  )}
                                </div>

                                {stage.intakeType === 'AUTO_BOM' && stage.materialsNeeded && (
                                  <span style={{ fontSize: '10px', color: '#0284c7', display: 'block' }}>
                                    Auto-deducts: {stage.materialsNeeded.map(m => `${m.qtyPerUnit} ${m.unit} ${m.materialName}`).join(', ')}
                                  </span>
                                )}
                                {stage.intakeType === 'STAGE_OUTPUT_ONLY' && (
                                  <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>
                                    Takes output strictly from preceding process.
                                  </span>
                                )}
                              </div>

                              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '11px', display: 'grid', gap: '4px', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>Buffer Available:</span>
                                  <strong className="mono-num" style={{ color: (stage.inputAvailable || 0) > 0 ? '#16a34a' : '#dc2626' }}>{stage.inputAvailable || 0} Units</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>Processed Output:</span>
                                  <strong className="mono-num">{stage.completedCount || 0} Units</strong>
                                </div>
                              </div>

                              {stage.intakeType === 'MANUAL_INTAKE' && (
                                canOperate ? (
                                  <div style={{ marginBottom: '12px', padding: '8px', borderRadius: '8px', background: '#ffffff', border: '1px dashed #cbd5e1' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>PROCURE DIRECTLY INTO THIS STAGE BUFFER</span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <select 
                                        id={`mat_sel_${stage.id}`} 
                                        className="enterprise-input" 
                                        style={{ height: '34px', fontSize: '11px', flex: 1.5 }}
                                        defaultValue={stage.materialsNeeded?.[0]?.materialId || materialsCatalog[0]?.id}
                                      >
                                        {materialsCatalog.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                                      </select>
                                      <input 
                                        type="number" 
                                        className="enterprise-input mono-num" 
                                        placeholder="Qty" 
                                        value={stageIntakeInputs[stage.id] || ''} 
                                        onChange={e => setStageIntakeInputs({ ...stageIntakeInputs, [stage.id]: e.target.value })}
                                        style={{ height: '34px', width: '65px', fontSize: '11px' }} 
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const selectEl = document.getElementById(`mat_sel_${stage.id}`);
                                          handleStageManualProcure(stage.id, selectEl.value, stageIntakeInputs[stage.id]);
                                        }}
                                        className="btn-blue" 
                                        style={{ height: '34px', fontSize: '11px', padding: '0 8px', background: '#0284c7' }}
                                      >
                                        Extract
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ padding: '8px', borderRadius: '6px', background: '#f8fafc', textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
                                    Intake locked to {stage.assignedLabour}
                                  </div>
                                )
                              )}
                            </div>

                            {canOperate ? (
                              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                <input type="number" className="enterprise-input mono-num" placeholder="Units to complete" value={stageRunQty} onChange={e => setStageRunQty(e.target.value)} />
                                <button onClick={() => handleRunProcessStage(idx, stageRunQty)} className="btn-blue" style={{ background: isLast ? '#16a34a' : '#0284c7', whiteSpace: 'nowrap', fontSize: '12px', padding: '0 10px' }}>
                                  {isLast ? 'To Vault' : 'Pass Next'}
                                </button>
                              </div>
                            ) : (
                              <div style={{ padding: '8px', borderRadius: '6px', background: '#f8fafc', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
                                Execution restricted to {stage.assignedLabour}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="white-card" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                        No process stages defined for this product yet.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="white-card" style={{ textAlign: 'center', padding: '30px' }}>
                  Loading product pipelines...
                </div>
              )}
            </div>
          )}

          {currentSafeTab === 'fg_stock' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {products.map(p => (
                <div key={p.id} className="white-card" style={{ borderTop: '3px solid #16a34a' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>{p.name} Vault</span>
                  <div className="mono-num" style={{ fontSize: '28px', fontWeight: '800', margin: '8px 0 2px', color: '#16a34a' }}>
                    {inventory[`fg_${p.id}`] || 0} Units
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '12px', fontSize: '11px' }}>
                    <span style={{ color: '#64748b' }}>Sales Price:</span>
                    <span className="mono-num" style={{ fontWeight: '700' }}>{formatINR(p.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {currentSafeTab === 'pos' && (
            <div className="dual-col-responsive" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {products.map(p => (
                    <div key={p.id} className="white-card">
                      <h4 style={{ fontSize: '14px', fontWeight: '700' }}>{p.name}</h4>
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>In Vault: <strong className="mono-num">{inventory[`fg_${p.id}`] || 0} Units</strong></p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <span className="mono-num" style={{ fontSize: '14px', fontWeight: '800' }}>₹{p.price}</span>
                        {isSales && (
                          <button onClick={() => handleAddCart(p)} className="btn-blue" style={{ height: '32px', fontSize: '11px', padding: '0 8px' }}>{Icons.Plus} Cart</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isSales && (
                <div className="white-card">
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>Dispatch Manifest</h3>
                  <input className="enterprise-input" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer Entity" style={{ marginBottom: '10px' }} />
                  {dispatchCart.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                      <span>{c.name} × {c.qty}</span>
                      <strong className="mono-num">{formatINR(c.qty * c.price)}</strong>
                    </div>
                  ))}
                  {dispatchCart.length > 0 && (
                    <button onClick={handleCompleteDispatch} className="btn-blue" style={{ width: '100%', marginTop: '12px', background: '#16a34a' }}>
                      {Icons.Print} Confirm Dispatch
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {currentSafeTab === 'accounting' && (
            <div className="white-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800' }}>Operating Expense Ledger & Cost Records</h3>
              </div>
              <div className="table-responsive">
                <table>
                  <thead><tr><th>Voucher ID</th><th>Cost Category</th><th>Narration</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td className="mono-num" style={{ fontWeight: '700', color: '#0284c7' }}>{e.voucher}</td>
                        <td>{e.type}</td>
                        <td>{e.narration}</td>
                        <td className="mono-num" style={{ textAlign: 'right', fontWeight: '700', color: '#dc2626' }}>- {formatINR(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {showAddProcessModal && isSuper && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', border: '1px solid #cbd5e1' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>Add Process to {activeProduct.name}</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Configure new sequence, assigned worker and intake strategy.</p>

            <form onSubmit={handleCreateProcessStage}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>PROCESS NAME</label>
                <input 
                  className="enterprise-input" 
                  placeholder="e.g. Process 3: CNC Gear Shaving" 
                  value={newProcessForm.name} 
                  onChange={e => setNewProcessForm({ ...newProcessForm, name: e.target.value })} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>OUTPUT STATE</label>
                  <select 
                    className="enterprise-input" 
                    value={newProcessForm.stateOutput} 
                    onChange={e => setNewProcessForm({ ...newProcessForm, stateOutput: e.target.value })}
                  >
                    <option value="Intermediate">Intermediate</option>
                    <option value="Semi Finished">Semi Finished</option>
                    <option value="Finished Product">Finished Product</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>ASSIGNED LABOUR</label>
                  <select 
                    className="enterprise-input" 
                    value={newProcessForm.assignedLabour} 
                    onChange={e => setNewProcessForm({ ...newProcessForm, assignedLabour: e.target.value })}
                  >
                    <option value="labour_turning">Turning Specialist</option>
                    <option value="labour_teeth">Cutting Specialist</option>
                    <option value="labour_surface">Finishing Specialist</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>INTAKE STRATEGY (AUTO VS MANUAL)</label>
                <select 
                  className="enterprise-input" 
                  value={newProcessForm.intakeType} 
                  onChange={e => setNewProcessForm({ ...newProcessForm, intakeType: e.target.value })}
                >
                  <option value="AUTO_BOM">⚡ Auto-BOM (Deduct from Depot automatically)</option>
                  <option value="MANUAL_INTAKE">📦 Manual Intake (Labour extracts units per batch)</option>
                  <option value="STAGE_OUTPUT_ONLY">🔄 Output Only (Takes previous stage output)</option>
                </select>
              </div>

              {newProcessForm.intakeType !== 'STAGE_OUTPUT_ONLY' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>ASSOCIATED RAW MATERIAL</label>
                    <select 
                      className="enterprise-input" 
                      value={newProcessForm.materialId} 
                      onChange={e => setNewProcessForm({ ...newProcessForm, materialId: e.target.value })}
                    >
                      {materialsCatalog.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>QTY/UNIT</label>
                    <input 
                      type="number" 
                      className="enterprise-input mono-num" 
                      value={newProcessForm.qtyPerUnit} 
                      onChange={e => setNewProcessForm({ ...newProcessForm, qtyPerUnit: e.target.value })} 
                      required 
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>OVERHEAD / WAGE COST PER UNIT (₹)</label>
                <input 
                  type="number" 
                  className="enterprise-input mono-num" 
                  value={newProcessForm.overheadCostPerUnit} 
                  onChange={e => setNewProcessForm({ ...newProcessForm, overheadCostPerUnit: e.target.value })} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn-blue" style={{ flex: 1 }}>Save Process</button>
                <button type="button" onClick={() => setShowAddProcessModal(false)} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeBill && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', color: '#000000', borderRadius: '10px', padding: '20px', width: '100%', maxWidth: '340px', fontFamily: 'monospace' }}>
            <h2 style={{ fontSize: '15px', textAlign: 'center', textTransform: 'uppercase' }}>Manufacturer ERP Industrial</h2>
            <p style={{ textAlign: 'center', fontSize: '10px', marginBottom: '10px' }}>DISPATCH SLIP: {activeBill.invoiceNum}</p>
            <div style={{ borderBottom: '1px dashed #000', marginBottom: '8px' }}></div>
            {activeBill.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '3px 0' }}>
                <span>{it.name} × {it.qty}</span>
                <span className="mono-num">{formatINR(it.price * it.qty)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #000', marginTop: '8px', paddingTop: '6px', textAlign: 'center', fontWeight: 'bold' }}>
              NET PAYABLE: {formatINR(activeBill.total)}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button onClick={() => window.print()} className="btn-blue" style={{ flex: 1 }}>{Icons.Print} Print</button>
              <button onClick={() => setActiveBill(null)} className="btn-outline" style={{ flex: 1 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}