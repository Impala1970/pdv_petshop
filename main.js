const supabaseUrl = 'https://wcovgldivqtvcuvddylt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjb3ZnbGRpdnF0dmN1dmRkeWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTcyMDYsImV4cCI6MjEwMTYzMzIwNn0.c4SYB4e91VdqW58xVrI2RDXDNr15e6hmQaNZADMq0MA';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    // 1. Fixed Header on Scroll
    const header = document.getElementById('header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 2. Mobile Menu Toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const nav = document.getElementById('nav');
    const navLinks = document.querySelectorAll('.nav-link');
    
    mobileMenuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        const icon = mobileMenuToggle.querySelector('i');
        if (nav.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            const icon = mobileMenuToggle.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        });
    });

    // 3. Phone Mask (XX) XXXXX-XXXX
    const telefoneInput = document.getElementById('telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
            
            if (value.length > 11) value = value.slice(0, 11); // Max 11 digits
            
            if (value.length > 2) {
                value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
            }
            if (value.length > 10) {
                value = `${value.slice(0, 10)}-${value.slice(10)}`;
            }
            
            e.target.value = value;
        });
    }

    // 4. Date Picker Restrictions (Ano atual, Mês atual, Max 3 dias)
    const dateInput = document.getElementById('data');
    if (dateInput) {
        const today = new Date();
        
        const formatLocalYYYYMMDD = (d) => {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };
        
        const minDate = formatLocalYYYYMMDD(today);
        
        let maxDateObj = new Date();
        maxDateObj.setDate(today.getDate() + 3);
        
        // Se ultrapassar o mês atual, limita ao último dia do mês atual
        if (maxDateObj.getMonth() !== today.getMonth()) {
            maxDateObj = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        
        dateInput.setAttribute('min', minDate);
        dateInput.setAttribute('max', formatLocalYYYYMMDD(maxDateObj));
    }

    // 5. Form Submission handling to WhatsApp
    const bookingForm = document.getElementById('booking-form');
    
    // Lógica para mostrar/esconder o campo de Raça
    const especieSelect = document.getElementById('especie');
    const racaGroup = document.getElementById('racaGroup');
    const racaInput = document.getElementById('raca');
    
    if (especieSelect) {
        especieSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Cachorro') {
                racaGroup.style.display = 'block';
                racaInput.required = true;
            } else {
                racaGroup.style.display = 'none';
                racaInput.required = false;
                racaInput.value = '';
            }
        });
    }

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page reload
        
        // Disable button while processing
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        const originalBtnHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Agendando...';
        submitBtn.disabled = true;

        // Form Validation (HTML5 already does basic, but we ensure values exist)
        const tutorNome = document.getElementById('tutorNome').value;
        const telefone = document.getElementById('telefone').value;
        const petNome = document.getElementById('petNome').value;
        const especie = document.getElementById('especie').value;
        const porte = document.getElementById('porte').value;
        const servico = document.getElementById('servico').value;
        const data = document.getElementById('data').value;
        const horario = document.getElementById('horario').value;
        const observacoes = document.getElementById('observacoes').value;
        const racaValue = racaInput ? racaInput.value.trim() : '';
        const observacoesFinal = racaValue ? `Raça: ${racaValue}\n${observacoes}` : observacoes;
        
        // Format Date
        const dateObj = new Date(data + 'T00:00:00'); // avoiding timezone issues
        const dataFormatada = new Intl.DateTimeFormat('pt-BR').format(dateObj);
        
        // Save to Supabase
        try {
            const { data: insertedData, error } = await supabaseClient
                .from('agendamentos')
                .insert([
                    {
                        tutor_nome: tutorNome,
                        telefone: telefone,
                        pet_nome: petNome,
                        especie: especie,
                        porte: porte,
                        servico: servico,
                        data: data,
                        horario: horario,
                        observacoes: observacoesFinal,
                        status: 'pendente'
                    }
                ]);

            if (error) {
                console.error('Erro ao salvar no Supabase:', error);
                alert('Houve um problema ao salvar o agendamento. Por favor, tente novamente mais tarde.');
            } else {
                // Show success modal
                const modal = document.getElementById('success-modal');
                modal.classList.add('active');
                
                // Close modal event
                document.getElementById('close-modal').addEventListener('click', () => {
                    modal.classList.remove('active');
                }, { once: true });
            }
        } catch (err) {
            console.error('Erro de conexão com Supabase:', err);
            alert('Houve um problema de conexão. Por favor, tente novamente.');
        }
        
        // Reset form and button
        bookingForm.reset();
        submitBtn.innerHTML = originalBtnHtml;
        submitBtn.disabled = false;
    });

    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                // Account for fixed header
                const headerHeight = header.offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
  
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 4. Scroll Reveal Effect
    const revealElements = document.querySelectorAll('.section, .hero-content, .hero-image-wrapper, .service-card, .contact-card');
    
    // Initial state setup
    revealElements.forEach(el => el.classList.add('reveal'));
    
    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };
    
    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                entry.target.classList.remove('active');
            } else {
                entry.target.classList.add('active');
            }
        });
    }, revealOptions);
    
    revealElements.forEach(el => {
        revealOnScroll.observe(el);
    });
});
