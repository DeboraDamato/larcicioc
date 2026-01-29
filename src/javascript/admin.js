// Importar o firebase-config.js
import './firebase-config.js';

// Importar o FirebaseReservationManager
import { FirebaseReservationManager } from './firebase-config.js';

// Sistema de Administração de Reservas
class AdminSystem {
    constructor() {
        this.currentUser = null;
        this.reservations = [];
        this.filteredReservations = [];
        this.firebaseManager = null; // Inicializar como null
        this.init();
    }

    async init() {
        // Aguardar o Firebase estar pronto
        await this.initializeFirebase();
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    async initializeFirebase() {
        // Aguardar até que o firebaseReservationManager esteja disponível
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos máximo
        
        while (!window.firebaseReservationManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.firebaseReservationManager) {
            this.firebaseManager = window.firebaseReservationManager;
            console.log('Firebase Manager inicializado com sucesso!');
        } else {
            console.error('Erro: Firebase Manager não pôde ser inicializado');
            this.showNotification('Erro ao conectar com o banco de dados', 'error');
        }
    }

    setupEventListeners() {
        // Login
        const loginForm = document.getElementById('loginForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                if (this.login(username, password)) {
                    document.getElementById('loginError').textContent = '';
                } else {
                    document.getElementById('loginError').textContent = 'Credenziali non valide';
                }
            });
        }

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Filtros
        document.getElementById('searchReservations').addEventListener('input', () => {
            this.applyFilters();
        });
        
        document.getElementById('statusFilter').addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('dateFilter').addEventListener('change', () => {
            this.applyFilters();
        });
        
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });

        // Export
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Modal
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('reservationModal').addEventListener('click', (e) => {
            if (e.target.id === 'reservationModal') {
                this.closeModal();
            }
        });
    }

    // Autenticação
    checkAuthStatus() {
        const savedAuth = localStorage.getItem('adminAuth');
        if (savedAuth) {
            const authData = JSON.parse(savedAuth);
            if (this.isValidSession(authData)) {
                this.currentUser = authData.username;
                this.showDashboard();
                return;
            }
        }
        this.showLogin();
    }

    isValidSession(authData) {
        const now = new Date().getTime();
        const sessionDuration = 8 * 60 * 60 * 1000; // 8 horas
        return (now - authData.timestamp) < sessionDuration;
    }

    login(username, password) {
        // Credenciais simples (em produção, usar sistema mais seguro)
        const validCredentials = {
            'admin': 'larcicioc2025',
            'proprietario': 'restaurant123',
            'manager': 'manager2025'
        };

        if (validCredentials[username] && validCredentials[username] === password) {
            const authData = {
                username: username,
                timestamp: new Date().getTime()
            };
            localStorage.setItem('adminAuth', JSON.stringify(authData));
            this.currentUser = username;
            this.showDashboard();
            return true;
        }
        
        return false;
    }

    logout() {
        localStorage.removeItem('adminAuth');
        this.currentUser = null;
        this.showLogin();
    }

    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        document.getElementById('welcomeMessage').textContent = `Benvenuto, ${this.currentUser}`;
        this.loadDashboardData();
    }

    // Carregamento de dados
    async loadReservations() {
        try {
            if (!this.firebaseManager) {
                throw new Error('Firebase Manager não inicializado');
            }
            
            const result = await this.firebaseManager.getAllReservations();
            
            if (result.success) {
                this.reservations = result.data || [];
                this.filteredReservations = [...this.reservations];
                
                console.log(`Carregadas ${this.reservations.length} reservas do Firebase`);
                
                // Log dos IDs para debug - usando o campo correto
                // Remover o forEach de debug das linhas 181-184:
                // ❌ REMOVER ESTAS LINHAS:
                // this.reservations.forEach(r => {
                //     console.log('Reserva ID:', r.id, 'Tipo:', typeof r.id, 'Cliente:', r.nomeCompleto);
                //     console.log('Dados completos da reserva:', r);
                // });
                
            } else {
                throw new Error(result.error || 'Erro desconhecido ao carregar reservas');
            }
        } catch (error) {
            console.error('Erro ao carregar reservas do Firebase:', error);
            
            // Tentar carregar do localStorage apenas como último recurso
            const saved = localStorage.getItem('reservations');
            if (saved) {
                this.reservations = JSON.parse(saved);
                this.filteredReservations = [...this.reservations];
                console.warn('Carregadas reservas do localStorage (modo offline)');
                this.showNotification('Modo offline: algumas funcionalidades podem não funcionar', 'error');
            } else {
                this.reservations = [];
                this.filteredReservations = [];
                this.showNotification('Erro ao carregar reservas: ' + error.message, 'error');
            }
        }
    }

    async loadDashboardData() {
        await this.loadReservations();
        this.updateStatistics();
        this.renderReservations();
    }

    // Estatísticas
    updateStatistics() {
        const total = this.reservations.length;
        const pending = this.reservations.filter(r => r.status === 'pendente').length;
        const confirmed = this.reservations.filter(r => r.status === 'confermata').length;
        
        // Contar hóspedes de hoje
        const today = new Date().toISOString().split('T')[0];
        const todayReservations = this.reservations.filter(r => 
            r.dataReserva === today && (r.status === 'confermata' || r.status === 'completata')
        );
        const todayGuests = todayReservations.reduce((sum, r) => {
            const guests = parseInt(r.numeroPessoas) || 0;
            return sum + guests;
        }, 0);

        document.getElementById('totalReservations').textContent = total;
        document.getElementById('pendingReservations').textContent = pending;
        document.getElementById('confirmedReservations').textContent = confirmed;
        document.getElementById('todayGuests').textContent = todayGuests;
    }

    // Renderização
    renderReservations() {
        const container = document.getElementById('reservationsList'); // ID CORRETO
        
        if (!container) {
            console.error('Container de reservas não encontrado!');
            return;
        }
        
        // Limpar container
        container.innerHTML = '';
        
        if (this.filteredReservations.length === 0) {
            container.innerHTML = '<div class="no-reservations">Nenhuma reserva encontrada</div>';
            return;
        }
        
        // Renderizar cada reserva
        this.filteredReservations.forEach(reservation => {
            const reservationCard = this.createReservationCard(reservation);
            container.appendChild(reservationCard);
        });
    }

    createReservationCard(reservation) {
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('it-IT');
        };

        const statusClass = `status-${reservation.status || 'pendente'}`;
        const statusText = {
            'pendente': 'In Attesa',
            'confermata': 'Confermata',
            'completata': 'Completata',
            'cancellata': 'Cancellata'
        }[reservation.status || 'pendente'];

        const card = document.createElement('div');
        card.className = 'reservation-card';
        card.dataset.reservationId = reservation.id;
        card.onclick = () => this.showReservationDetails(reservation.id);

        card.innerHTML = `
            <div class="reservation-header">
                <div class="reservation-name">${reservation.nomeCompleto}</div>
                <div class="reservation-status ${statusClass}">${statusText}</div>
            </div>
            <div class="reservation-details">
                <div class="detail-item">
                    <i class="fa-solid fa-calendar"></i>
                    <span>${formatDate(reservation.dataReserva)}</span>
                </div>
                <div class="detail-item">
                    <i class="fa-solid fa-clock"></i>
                    <span>${reservation.horarioReserva}</span>
                </div>
                <div class="detail-item">
                    <i class="fa-solid fa-users"></i>
                    <span>${reservation.numeroPessoas} ${parseInt(reservation.numeroPessoas) === 1 ? 'persona' : 'persone'}</span>
                </div>
                <div class="detail-item">
                    <i class="fa-solid fa-phone"></i>
                    <span>${reservation.contato}</span>
                </div>
            </div>
        `;

        return card;
    }

    // Modal de detalhes
    showReservationDetails(reservationId) {
        const reservation = this.reservations.find(r => String(r.id) === String(reservationId));
        
        if (!reservation) {
            console.error('Reserva não encontrada para ID:', reservationId);
            return;
        }

        const modal = document.getElementById('reservationModal');
        const modalBody = document.getElementById('modalBody');
        
        const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('it-IT', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        };

        const createdAt = new Date(reservation.timestamp).toLocaleString('it-IT');

        modalBody.innerHTML = `
            <div style="display: grid; gap: 20px;">
                <div>
                    <h4 style="color: var(--color-primar6); margin-bottom: 10px;">Informazioni Cliente</h4>
                    <p><strong>Nome:</strong> ${reservation.nomeCompleto}</p>
                    <p><strong>Contatto:</strong> ${reservation.contato}</p>
                </div>
                
                <div>
                    <h4 style="color: var(--color-primar6); margin-bottom: 10px;">Dettagli Prenotazione</h4>
                    <p><strong>Data:</strong> ${formatDate(reservation.dataReserva)}</p>
                    <p><strong>Orario:</strong> ${reservation.horarioReserva}</p>
                    <p><strong>Numero Persone:</strong> ${reservation.numeroPessoas}</p>
                    <p><strong>Status:</strong> <span class="reservation-status status-${reservation.status || 'pendente'}">${{
                        'pendente': 'In Attesa',
                        'confermata': 'Confermata', 
                        'completata': 'Completata',
                        'cancellata': 'Cancellata'
                    }[reservation.status || 'pendente']}</span></p>
                </div>
                
                ${reservation.observacoes ? `
                    <div>
                        <h4 style="color: var(--color-primar6); margin-bottom: 10px;">Note</h4>
                        <p style="background: #f8f9fa; padding: 15px; border-radius: 8px;">${reservation.observacoes}</p>
                    </div>
                ` : ''}
                
                <div>
                    <h4 style="color: var(--color-primar6); margin-bottom: 10px;">Informazioni Sistema</h4>
                    <p><strong>Prenotazione creata:</strong> ${createdAt}</p>
                    <p><strong>ID:</strong> ${reservation.id}</p>
                </div>
            </div>
        `;
        
        // Configurar botões do modal
        this.setupModalButtons(reservation);
        modal.style.display = 'flex';
    }

    setupModalButtons(reservation) {
        const confirmBtn = document.getElementById('modalConfirm');
        const completeBtn = document.getElementById('modalComplete');
        const cancelBtn = document.getElementById('modalCancel');
        
        // Mostrar/ocultar botões baseado no status
        const status = reservation.status || 'pendente';
        
        confirmBtn.style.display = status === 'pendente' ? 'block' : 'none';
        completeBtn.style.display = status === 'confermata' ? 'block' : 'none';
        cancelBtn.style.display = ['pendente', 'confermata'].includes(status) ? 'block' : 'none';
        
        // Remover listeners anteriores
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        completeBtn.replaceWith(completeBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        
        // Adicionar novos listeners
        document.getElementById('modalConfirm').addEventListener('click', () => {
            this.updateReservationStatus(reservation.id, 'confermata');
        });
        
        document.getElementById('modalComplete').addEventListener('click', () => {
            this.updateReservationStatus(reservation.id, 'completata');
        });
        
        document.getElementById('modalCancel').addEventListener('click', () => {
            if (confirm('Sei sicuro di voler cancellare questa prenotazione?')) {
                this.updateReservationStatus(reservation.id, 'cancellata');
            }
        });
    }

    async updateReservationStatus(reservationId, newStatus) {
        try {
            // FORÇA CONVERSÃO PARA STRING
            const id = String(reservationId);
            if (!id || id === 'undefined' || id === 'null') {
                throw new Error('ID da reserva inválido');
            }
            
            // Buscar a reserva localmente
            const reservation = this.reservations.find(r => String(r.id) === id);
            if (!reservation) {
                throw new Error(`Reserva com ID ${id} não encontrada`);
            }
            
            // USAR O ID CONVERTIDO PARA STRING
            let result = await this.firebaseManager.updateReservationStatus(id, newStatus);
            
            // Se falhar, tentar a função alternativa (também com ID convertido)
            if (!result.success && result.error.includes('não encontrado')) {
                result = await this.firebaseManager.updateReservationStatusAlternative(id, newStatus);
            }
            
            if (result.success) {
                // Atualizar localmente
                reservation.status = newStatus;
                
                // Recarregar dados do Firebase para garantir sincronização
                await this.loadReservations();
                
                // Atualizar interface
                this.updateStatistics();
                this.renderReservations();
                this.closeModal();
                
                this.showNotification(`Reserva ${newStatus} com sucesso!`, 'success');
            } else {
                throw new Error(result.error || 'Erro ao atualizar no Firebase');
            }
            
        } catch (error) {
            console.error('Admin: Erro ao atualizar status da reserva:', error);
            this.showNotification('Erro ao atualizar reserva: ' + error.message, 'error');
        }
    }

    closeModal() {
        document.getElementById('reservationModal').style.display = 'none';
    }

    // Filtros e busca
    applyFilters() {
        const searchTerm = document.getElementById('searchReservations').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;
        
        this.filteredReservations = this.reservations.filter(reservation => {
            // Filtro de busca
            const matchesSearch = !searchTerm || 
                reservation.nomeCompleto.toLowerCase().includes(searchTerm) ||
                reservation.contato.toLowerCase().includes(searchTerm);
            
            // Filtro de status
            const matchesStatus = !statusFilter || 
                (reservation.status || 'pendente') === statusFilter;
            
            // Filtro de data
            const matchesDate = !dateFilter || 
                reservation.dataReserva === dateFilter;
            
            return matchesSearch && matchesStatus && matchesDate;
        });
        
        this.renderReservations();
    }

    clearFilters() {
        document.getElementById('searchReservations').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('dateFilter').value = '';
        this.filteredReservations = [...this.reservations];
        this.renderReservations();
    }

    // Export CSV
    exportToCSV() {
        if (this.reservations.length === 0) {
            this.showNotification('Nessuna prenotazione da esportare', 'error');
            return;
        }

        const headers = ['ID', 'Nome', 'Data', 'Orario', 'Persone', 'Contatto', 'Status', 'Note', 'Creata'];
        const csvContent = [headers.join(',')];
        
        this.reservations.forEach(r => {
            const row = [
                r.id,
                `"${r.nomeCompleto}"`,
                r.dataReserva,
                r.horarioReserva,
                r.numeroPessoas,
                `"${r.contato}"`,
                r.status || 'pendente',
                `"${r.observacoes || ''}"`,
                new Date(r.timestamp).toLocaleString('it-IT')
            ];
            csvContent.push(row.join(','));
        });
        
        const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prenotazioni_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showNotification('File CSV esportato con successo!', 'success');
    }

    // Notificações
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '10px',
            color: 'white',
            backgroundColor: type === 'success' ? '#27ae60' : '#e74c3c',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '9999',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Inicializar sistema admin
const adminSystem = new AdminSystem();

// Tornar disponível globalmente para uso no HTML
window.adminSystem = adminSystem;
