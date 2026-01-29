// Importar o FirebaseReservationManager
import { FirebaseReservationManager } from './firebase-config.js';

$(document).ready(function() {
    $('#mobile_btn').on('click', function () {
        $('#mobile_menu').toggleClass('active');
        $('#mobile_btn').find('i').toggleClass('fa-bars fa-xmark');
    });

    const sections = $('section');
    const navItems= $('.nav_item');

    $(window).on('scroll', function () {
        const header = $('header');
        const scrollPosition = $(window).scrollTop() - header.outerHeight();

        let activeSectionIndex = 0;

        if (scrollPosition <= 0) {
            header.css('box-shadow', 'none');
        }
        else {
            header.css('box-shadow', '5px 1px 5px rgba(0, 0, 0, 0.1)');
        }

        sections.each(function(i) {
            const section = $(this);
            const sectionTop = section.offset().top - 96;
            const sectionBottom = sectionTop+ section.outerHeight();

            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                activeSectionIndex = i;
                return false; // Exit loop
            }
        })
        navItems.removeClass('active');
        $(navItems[activeSectionIndex]).addClass('active');
        });

        ScrollReveal().reveal('#cta', {
            origin: 'left',
            duration: 2000,
            distance: '20%',

        });

        ScrollReveal().reveal('.dish', {
            origin: 'right',
            duration: 2000,
            distance: '20%',

        });

        ScrollReveal().reveal('#testimonials_chef', {
            origin: 'left',
            duration: 1000,
            distance: '20%',

        });

        ScrollReveal().reveal('.feedback', {
            origin: 'left',
            duration: 1000,
            distance: '20%',

        });

        ScrollReveal().reveal('#footer-items', {
            origin: 'bottom',
            duration: 1000,
            distance: '20%',

        });

    // Sistema de Reservas
    class ReservationSystem {
        constructor() {
            this.form = document.getElementById('reservationForm');
            this.whatsappBtn = document.getElementById('sendWhatsApp');
            this.firebaseManager = new FirebaseReservationManager();
            this.init();
        }
    
        init() {
            // Definir data mínima (hoje) e máxima (30 dias)
            this.setDateLimits();
            
            // Event listeners
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
            this.whatsappBtn.addEventListener('click', () => this.sendToWhatsApp());
            
            // Validação em tempo real
            this.setupRealTimeValidation();
        }
    
        setDateLimits() {
            const dateInput = document.getElementById('dataReserva');
            const today = new Date();
            const maxDate = new Date();
            maxDate.setDate(today.getDate() + 30);
            
            dateInput.min = today.toISOString().split('T')[0];
            dateInput.max = maxDate.toISOString().split('T')[0];
        }
    
        setupRealTimeValidation() {
            const inputs = this.form.querySelectorAll('input[required], select[required]');
            
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.clearError(input));
            });
        }
    
        validateField(field) {
            const value = field.value.trim();
            const fieldName = field.name;
            let isValid = true;
            let errorMessage = '';
    
            // Limpar classes anteriores
            field.classList.remove('valid', 'invalid');
    
            switch(fieldName) {
                case 'nomeCompleto':
                    if (!value) {
                        errorMessage = 'Nome completo é obrigatório';
                        isValid = false;
                    } else if (value.length < 3) {
                        errorMessage = 'Nome deve ter pelo menos 3 caracteres';
                        isValid = false;
                    } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(value)) {
                        errorMessage = 'Nome deve conter apenas letras';
                        isValid = false;
                    }
                    break;
    
                case 'numeroPessoas':
                    if (!value) {
                        errorMessage = 'Número de pessoas é obrigatório';
                        isValid = false;
                    }
                    break;
    
                case 'dataReserva':
                    if (!value) {
                        errorMessage = 'Data da reserva é obrigatória';
                        isValid = false;
                    } else {
                        const selectedDate = new Date(value);
                        const today = new Date();
                        const maxDate = new Date();
                        maxDate.setDate(today.getDate() + 30);
                        
                        today.setHours(0, 0, 0, 0);
                        selectedDate.setHours(0, 0, 0, 0);
                        
                        if (selectedDate < today) {
                            errorMessage = 'Data não pode ser anterior a hoje';
                            isValid = false;
                        } else if (selectedDate > maxDate) {
                            errorMessage = 'Data não pode ser superior a 30 dias';
                            isValid = false;
                        }
                    }
                    break;
    
                case 'horarioReserva':
                    if (!value) {
                        errorMessage = 'Horário é obrigatório';
                        isValid = false;
                    }
                    break;
    
                case 'contato':
                    if (!value) {
                        errorMessage = 'Telefone ou email é obrigatório';
                        isValid = false;
                    } else {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
                        
                        if (!emailRegex.test(value) && !phoneRegex.test(value)) {
                            errorMessage = 'Insira um telefone ou email válido';
                            isValid = false;
                        }
                    }
                    break;
            }
    
            // Mostrar erro
            const errorElement = document.getElementById(fieldName.replace(/([A-Z])/g, '').toLowerCase() + 'Error');
            if (errorElement) {
                errorElement.textContent = errorMessage;
            }
    
            // Adicionar classe visual
            field.classList.add(isValid ? 'valid' : 'invalid');
            
            return isValid;
        }
    
        clearError(field) {
            const fieldName = field.name;
            const errorElement = document.getElementById(fieldName.replace(/([A-Z])/g, '').toLowerCase() + 'Error');
            if (errorElement && field.value.trim()) {
                errorElement.textContent = '';
                field.classList.remove('invalid');
            }
        }
    
        validateForm() {
            const requiredFields = this.form.querySelectorAll('input[required], select[required]');
            let isFormValid = true;
    
            requiredFields.forEach(field => {
                if (!this.validateField(field)) {
                    isFormValid = false;
                }
            });
    
            return isFormValid;
        }
    
        getFormData() {
            const formData = new FormData(this.form);
            const data = {};
            
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            return data;
        }
    
        async handleSubmit(e) {
            e.preventDefault();
            
            if (this.validateForm()) {
                const data = this.getFormData();
                try {
                    await this.saveReservation(data);
                    this.showSuccessMessage('Reserva salva com sucesso!');
                    this.form.reset();
                } catch (error) {
                    console.error('Erro ao salvar reserva:', error);
                    this.showErrorMessage('Erro ao salvar reserva. Tente novamente.');
                }
            } else {
                this.showErrorMessage('Por favor, corrija os erros no formulário');
            }
        }
    
        async saveReservation(data) {
            const reservation = {
                ...data,
                bookingCode: Date.now(), // ✅ Código legível para o cliente
                timestamp: new Date().toISOString(),
                status: 'pendente'
            };
            
            await this.firebaseManager.saveReservation(reservation);
        }
    
        sendToWhatsApp() {
            if (!this.validateForm()) {
                this.showErrorMessage('Por favor, preencha todos os campos obrigatórios');
                return;
            }
    
            const data = this.getFormData();
            const message = this.formatWhatsAppMessage(data);
            const phoneNumber = '393514193029'; // Número do restaurante
            const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            
            window.open(whatsappUrl, '_blank');
        }
    
        formatWhatsAppMessage(data) {
            const formatDate = (dateStr) => {
                const date = new Date(dateStr);
                return date.toLocaleDateString('it-IT', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            };
    
            let message = `🍽️ *PRENOTAZIONE RISTORANTE L'ARCICIOC*\n\n`;
            message += `👤 *Nome:* ${data.nomeCompleto}\n`;
            message += `👥 *Persone:* ${data.numeroPessoas}\n`;
            message += `📅 *Data:* ${formatDate(data.dataReserva)}\n`;
            message += `🕐 *Orario:* ${data.horarioReserva}\n`;
            message += `📞 *Contatto:* ${data.contato}\n`;
            
            if (data.observacoes) {
                message += `📝 *Note:* ${data.observacoes}\n`;
            }
            
            message += `\n✅ Confermate la prenotazione, grazie!`;
            
            return message;
        }
    
        showSuccessMessage(message = 'Reserva salva com sucesso!') {
            this.showNotification(message, 'success');
        }
    
        showErrorMessage(message) {
            this.showNotification(message, 'error');
        }
    
        showNotification(message, type) {
            // Criar elemento de notificação
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            `;
            
            // Adicionar estilos inline
            Object.assign(notification.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '15px 20px',
                borderRadius: '10px',
                color: 'white',
                backgroundColor: type === 'success' ? '#4fc35d' : '#e74c3c',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: '9999',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transform: 'translateX(100%)',
                transition: 'transform 0.3s ease'
            });
            
            document.body.appendChild(notification);
            
            // Animar entrada
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 100);
            
            // Remover após 4 segundos
            setTimeout(() => {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 4000);
        }
    }
    
    // Inicializar sistema de reservas quando o DOM estiver pronto
    new ReservationSystem();
    
    // Adicionar animação ScrollReveal para a seção de reservas
    ScrollReveal().reveal('#reservation-container', {
        origin: 'bottom',
        duration: 1000,
        distance: '30px',
        delay: 200
    });
});

