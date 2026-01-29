// Configuração do Firebase
// IMPORTANTE: Substitua pelas suas credenciais reais do Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDC_zJ-uOo-tY8_CWrVC8REdcxA9YQqX1I",
    authDomain: "larcicioc.firebaseapp.com",
    projectId: "larcicioc",
    storageBucket: "larcicioc.firebasestorage.app",
    messagingSenderId: "1047829681796",
    appId: "1:1047829681796:web:c33e53867d044f0c31d4d1"
};

// Inicializar Firebase
// Importar getDoc também
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Exportar para uso global
window.db = db;
window.firestore = {
  collection,
  addDoc,
  getDocs,
  getDoc,  // Adicionar getDoc
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
};

// Classe para gerenciar reservas no Firebase
class FirebaseReservationManager {
  constructor() {
    this.collectionName = 'reservations';
  }

  // Salvar nova reserva
  async saveReservation(reservationData) {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...reservationData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Erro ao salvar reserva:', error);
      return { success: false, error: error.message };
    }
  }

  // Buscar todas as reservas
  async getAllReservations() {
    try {
      const q = query(collection(db, this.collectionName), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const reservations = [];
      
      querySnapshot.forEach((doc) => {
        reservations.push({
          ...doc.data(),  // ✅ PRIMEIRO os dados do documento
          id: doc.id      // ✅ DEPOIS o ID real (sobrescreve qualquer campo 'id' interno)
        });
      });
      
      return { success: true, data: reservations };
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
      return { success: false, error: error.message };
    }
  }

  // Atualizar status da reserva
  // Corrigir a função updateReservationStatus
  async updateReservationStatus(reservationId, newStatus) {
    try {
      // FORÇA CONVERSÃO PARA STRING - Esta é a correção principal!
      const id = String(reservationId);
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('ID da reserva inválido');
      }
      
      // Usar o ID convertido para string
      const reservationRef = doc(db, this.collectionName, id);
      
      // Verificar se o documento existe
      const docSnap = await getDoc(reservationRef);
      if (!docSnap.exists()) {
        console.error('Firebase: Documento não encontrado com ID:', id);
        return { success: false, error: `Documento com ID ${id} não encontrado` };
      }
      
      // Atualizar o documento
      await updateDoc(reservationRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Firebase: Erro ao atualizar reserva:', error);
      console.error('Firebase: Stack trace:', error.stack);
      return { success: false, error: error.message };
    }
  }

  // Deletar reserva
  async deleteReservation(reservationId) {
    try {
      await deleteDoc(doc(db, this.collectionName, reservationId));
      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar reserva:', error);
      return { success: false, error: error.message };
    }
  }

  // Função alternativa para atualizar status
  // Também corrigir a função alternativa
  async updateReservationStatusAlternative(reservationId, newStatus) {
    try {
      // FORÇA CONVERSÃO PARA STRING
      const id = String(reservationId);
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('ID da reserva inválido');
      }
      
      console.log('Firebase Alternative: Buscando reserva com ID:', id);
      
      // Buscar todas as reservas e encontrar a correta
      const q = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(q);
      
      let foundDoc = null;
      querySnapshot.forEach((doc) => {
        if (doc.id === id) {
          foundDoc = doc;
        }
      });
      
      if (!foundDoc) {
        console.error('Firebase Alternative: Reserva não encontrada:', id);
        return { success: false, error: 'Reserva não encontrada' };
      }
      
      // Atualizar usando a referência encontrada
      await updateDoc(foundDoc.ref, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      console.log('Firebase Alternative: Reserva atualizada com sucesso!');
      return { success: true };
      
    } catch (error) {
      console.error('Firebase Alternative: Erro:', error);
      return { success: false, error: error.message };
    }
  }
}

// Instância global
window.firebaseReservationManager = new FirebaseReservationManager();

// Export para módulos ES6
export { FirebaseReservationManager };