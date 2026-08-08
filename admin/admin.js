const supabaseUrl = 'https://wcovgldivqtvcuvddylt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjb3ZnbGRpdnF0dmN1dmRkeWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNTcyMDYsImV4cCI6MjEwMTYzMzIwNn0.c4SYB4e91VdqW58xVrI2RDXDNr15e6hmQaNZADMq0MA';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('agendamentos-tbody');
    const emptyState = document.getElementById('empty-state');
    const filterDateInput = document.getElementById('filter-date');
    const filterStatusSelect = document.getElementById('filter-status');
    const filterServiceSelect = document.getElementById('filter-service');
    const btnToday = document.getElementById('btn-today');
    const btnAll = document.getElementById('btn-all');
    
    // Vendas DOM Elements
    const vendasTableContainer = document.getElementById('vendas-table-container');
    const vendasEmptyState = document.getElementById('vendas-empty-state');
    const vendasTbody = document.getElementById('vendas-tbody');
    const btnCloseModalVenda = document.getElementById('btn-close-modal-venda');
    const formNovaVenda = document.getElementById('form-nova-venda');
    const selectCategoria = document.getElementById('venda-categoria');
    
    // Filtros de Vendas
    const filterDateVendas = document.getElementById('filter-date-vendas');
    const btnTodayVendas = document.getElementById('btn-today-vendas');
    const btnAllVendas = document.getElementById('btn-all-vendas');
    
    const totalAgendamentosEl = document.getElementById('total-agendamentos');
    const totalConcluidosEl = document.getElementById('total-concluidos');
    const totalFaturamentoEl = document.getElementById('total-faturamento');
    
    let currentFilteredData = []; // Store globally for CSV export

    // Tabela de Preços (Fictícia)
    const precosServicos = {
        'Banho Relaxante': 40,
        'Tosa Higiênica': 30,
        'Tosa na Tesoura': 80,
        'Tosa Máquina': 60, // Matches exactly the option value
        'Hidratação': 35,
        'Corte de Unhas': 15,
        'Pacote Completo': 100 // Banho + Tosa
    };

    // Get today's date in YYYY-MM-DD format based on local timezone
    const getTodayString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Initialize filter date to today
    filterDateInput.value = getTodayString();

    // Load data from Supabase
    const getAgendamentos = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('agendamentos')
                .select('*')
                .order('data', { ascending: true })
                .order('horario', { ascending: true });
                
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar agendamentos:', error);
            return [];
        }
    };

    const getVendas = async () => {
        try {
            const { data, error } = await supabaseClient
                .from('vendas')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) {
                alert("Erro ao buscar vendas no banco: " + error.message);
                throw error;
            }
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar vendas:', error);
            return [];
        }
    };

    // Format Date from YYYY-MM-DD to DD/MM/YYYY
    const formatDate = (dateString) => {
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
    };

    // Render table
    const renderTable = async (filterDate = null) => {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>';
        
        const todosAgendamentos = await getAgendamentos();
        const todasVendas = await getVendas();
        
        // Update charts with all global data
        renderCharts(todosAgendamentos, todasVendas);
        renderFinanceiro(todosAgendamentos, todasVendas);
        
        // Filters
        let agendamentosFiltrados = todosAgendamentos;
        
        // Filter by Date
        if (filterDate) {
            agendamentosFiltrados = agendamentosFiltrados.filter(a => a.data === filterDate);
        }

        // Filter by Status
        if (filterStatusSelect.value !== 'todos') {
            agendamentosFiltrados = agendamentosFiltrados.filter(a => a.status === filterStatusSelect.value);
        }

        // Filter by Service
        if (filterServiceSelect.value !== 'todos') {
            agendamentosFiltrados = agendamentosFiltrados.filter(a => a.servico === filterServiceSelect.value);
        }

        // Faturamento
        const faturamento = agendamentosFiltrados.reduce((total, agendamento) => {
            const preco = precosServicos[agendamento.servico] || 0;
            return total + preco;
        }, 0);

        // Stats
        totalAgendamentosEl.textContent = agendamentosFiltrados.length;
        totalConcluidosEl.textContent = agendamentosFiltrados.filter(a => a.status === 'concluido').length;
        totalFaturamentoEl.textContent = `R$ ${faturamento.toFixed(2).replace('.', ',')}`;

        // Update global variable for CSV
        currentFilteredData = agendamentosFiltrados;
        
        tbody.innerHTML = '';

        if (agendamentosFiltrados.length === 0) {
            emptyState.style.display = 'flex';
            tbody.parentElement.style.display = 'none'; // hide table head if empty
        } else {
            emptyState.style.display = 'none';
            tbody.parentElement.style.display = 'table';
            
            agendamentosFiltrados.forEach(agendamento => {
                const tr = document.createElement('tr');
                if (agendamento.status === 'concluido') {
                    tr.classList.add('row-concluido');
                }
                
                // Parse Raça and Observacoes
                let racaInfo = '';
                let obsReal = agendamento.observacoes || '';
                
                if (obsReal.startsWith('Raça: ')) {
                    const lines = obsReal.split('\n');
                    racaInfo = lines[0].replace('Raça: ', '');
                    obsReal = lines.slice(1).join('\n').trim();
                }

                // Get Price
                const preco = precosServicos[agendamento.servico] || 0;
                const precoFormatado = preco > 0 ? `R$ ${preco.toFixed(2).replace('.', ',')}` : 'Preço sob consulta';

                tr.innerHTML = `
                    <td>
                        <strong>${formatDate(agendamento.data)}</strong><br>
                        <span class="text-light">${agendamento.horario}</span>
                    </td>
                    <td>
                        <strong>${agendamento.pet_nome}</strong><br>
                        <span class="badge" style="margin-bottom: 4px;">${agendamento.especie} - ${agendamento.porte}</span>
                        ${racaInfo ? `<br><small class="text-light"><i class="fas fa-dog"></i> Raça: ${racaInfo}</small>` : ''}
                    </td>
                    <td>
                        ${agendamento.tutor_nome}<br>
                        <a href="https://wa.me/55${agendamento.telefone.replace(/\D/g, '')}" target="_blank" class="text-primary">
                            <i class="fab fa-whatsapp"></i> ${agendamento.telefone}
                        </a>
                    </td>
                    <td>
                        <strong>${agendamento.servico}</strong><br>
                        <span class="badge" style="background: #e0f2fe; color: #0284c7; margin-bottom: 4px;">${precoFormatado}</span>
                        ${obsReal ? `<br><small class="text-light"><i class="fas fa-info-circle"></i> ${obsReal}</small>` : ''}
                    </td>
                    <td>
                        <span class="status-badge status-${agendamento.status}">
                            ${agendamento.status === 'pendente' ? 'Pendente' : 'Confirmado'}
                        </span>
                    </td>
                    <td class="actions-cell">
                        ${agendamento.status === 'pendente' 
                            ? `<button class="btn-action btn-success btn-complete" data-id="${agendamento.id}" title="Confirmar Agendamento"><i class="fas fa-check"></i></button>`
                            : `<button class="btn-action btn-warning btn-pending" data-id="${agendamento.id}" title="Voltar para pendente"><i class="fas fa-undo"></i></button>`
                        }
                        <button class="btn-action btn-danger btn-delete" data-id="${agendamento.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Attach Event Listeners to generated buttons
        document.querySelectorAll('.btn-complete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const agendamento = agendamentosFiltrados.find(a => a.id.toString() === id);
                updateStatus(id, 'concluido', agendamento);
            });
        });
        
        document.querySelectorAll('.btn-pending').forEach(btn => {
            btn.addEventListener('click', (e) => updateStatus(e.currentTarget.dataset.id, 'pendente'));
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => deleteAgendamento(e.currentTarget.dataset.id));
        });
    };

    // Render Vendas Table
    const renderVendasTable = async (dateFilter = null) => {
        if (!vendasTbody) return; // Segurança caso não tenha sido inicializado
        vendasTbody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>';
        
        let vendas = await getVendas();
        
        // Filter by Date
        if (dateFilter) {
            vendas = vendas.filter(v => {
                const dateObj = new Date(v.created_at);
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}` === dateFilter;
            });
        }
        
        vendasTbody.innerHTML = '';
        
        if (vendas.length === 0) {
            if(vendasEmptyState) vendasEmptyState.style.display = 'flex';
            if(vendasTableContainer) vendasTableContainer.style.display = 'none';
        } else {
            if(vendasEmptyState) vendasEmptyState.style.display = 'none';
            if(vendasTableContainer) vendasTableContainer.style.display = 'block';
            
            vendas.forEach(venda => {
                const tr = document.createElement('tr');
                
                const dateObj = new Date(venda.created_at);
                const dataFmt = dateObj.toLocaleDateString('pt-BR');
                const horaFmt = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                let detalhesInfo = '';
                if (venda.categoria === 'Ração' && venda.kilos) {
                    detalhesInfo = `${venda.kilos} Kg`;
                } else {
                    detalhesInfo = `${venda.quantidade || 1} un.`;
                }
                
                let pagamentoFmt = venda.pagamento;
                let pagamentoIcon = '<i class="fas fa-money-bill-wave text-success"></i>';
                
                if (venda.pagamento === 'Pix') {
                    pagamentoIcon = '<i class="fab fa-pix" style="color: #32bcad;"></i>';
                } else if (venda.pagamento === 'Cartão') {
                    pagamentoFmt = `Cartão (${venda.cartao_tipo || 'Crédito'})`;
                    pagamentoIcon = '<i class="fas fa-credit-card text-primary"></i>';
                }
                
                tr.innerHTML = `
                    <td>
                        <strong>${dataFmt}</strong><br>
                        <span class="text-light">${horaFmt}</span>
                    </td>
                    <td><span class="badge">${venda.categoria}</span></td>
                    <td><strong>${venda.produto}</strong></td>
                    <td>${detalhesInfo}</td>
                    <td>
                        ${pagamentoIcon} <span style="margin-left: 4px;">${pagamentoFmt}</span>
                    </td>
                    <td>
                        <strong>R$ ${Number(venda.total).toFixed(2).replace('.', ',')}</strong><br>
                        <small class="text-light">R$ ${Number(venda.preco).toFixed(2).replace('.', ',')} / un</small>
                    </td>
                `;
                vendasTbody.appendChild(tr);
            });
        }
    };

    // Actions
    const updateStatus = async (id, newStatus, agendamento = null) => {
        let whatsappWindow = null;
        
        // Send WhatsApp confirmation if status is changed to concluido
        // Must be done synchronously before 'await' to bypass popup blockers
        if (newStatus === 'concluido' && agendamento) {
            const dataFormatada = formatDate(agendamento.data);
            
            let racaMsg = '';
            if (agendamento.observacoes && agendamento.observacoes.startsWith('Raça: ')) {
                const raca = agendamento.observacoes.split('\n')[0].replace('Raça: ', '');
                racaMsg = `• Raça: ${raca}\n`;
            }
            
            let mensagem = `Olá ${agendamento.tutor_nome},\nSeu agendamento foi confirmado!\n\n`;
            mensagem += `• Nome do animal: ${agendamento.pet_nome}\n`;
            if (racaMsg) mensagem += racaMsg;
            mensagem += `• Peso/Porte: ${agendamento.porte}\n`;
            mensagem += `• Data: ${dataFormatada}\n`;
            mensagem += `• Horário: ${agendamento.horario}\n`;
            mensagem += `• Serviço: ${agendamento.servico}\n\n`;
            mensagem += `Agradecemos a preferência!`;
            
            const textoCodificado = encodeURIComponent(mensagem);
            const numeroWhatsApp = agendamento.telefone.replace(/\D/g, ''); // Remove non-numeric chars
            const linkWhatsApp = `https://wa.me/55${numeroWhatsApp}?text=${textoCodificado}`;
            
            whatsappWindow = window.open(linkWhatsApp, '_blank');
        }

        try {
            const { error } = await supabaseClient
                .from('agendamentos')
                .update({ status: newStatus })
                .eq('id', id);
                
            if (error) {
                if (whatsappWindow) whatsappWindow.close();
                throw error;
            }
            
            renderTable(filterDateInput.value);
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            alert('Não foi possível atualizar o agendamento.');
        }
    };

    const deleteAgendamento = async (id) => {
        if (confirm('Tem certeza que deseja excluir este agendamento permanentemente?')) {
            try {
                const { error } = await supabaseClient
                    .from('agendamentos')
                    .delete()
                    .eq('id', id);
                    
                if (error) throw error;
                renderTable(filterDateInput.value);
            } catch (error) {
                console.error('Erro ao excluir:', error);
                alert('Não foi possível excluir o agendamento.');
            }
        }
    };

    // CSV Export Logic
    const btnExportCsv = document.getElementById('btn-export-csv');
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
            if (!currentFilteredData || currentFilteredData.length === 0) {
                alert('Nenhum dado para exportar.');
                return;
            }
            
            // Build CSV Content
            const headers = ['ID', 'Tutor', 'Telefone', 'Pet', 'Espécie', 'Porte', 'Serviço', 'Data', 'Horário', 'Status', 'Valor (R$)'];
            let csvContent = '\uFEFF' + headers.join(',') + '\n'; // Add BOM for Excel UTF-8 support
            
            currentFilteredData.forEach(item => {
                const row = [
                    item.id,
                    `"${item.tutor_nome}"`,
                    `"${item.telefone}"`,
                    `"${item.pet_nome}"`,
                    `"${item.especie}"`,
                    `"${item.porte}"`,
                    `"${item.servico}"`,
                    `"${formatDate(item.data)}"`,
                    `"${item.horario}"`,
                    `"${item.status}"`,
                    precosServicos[item.servico] || 0
                ];
                csvContent += row.join(',') + '\n';
            });
            
            // Trigger Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `agendamentos_${getTodayString()}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Render Agenda
    const renderAgendaTable = async () => {
        const tbody = document.getElementById('agenda-tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="3" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>';
        
        const todosAgendamentos = await getAgendamentos();
        
        const grouped = {};
        todosAgendamentos.forEach(a => {
            if (a.status === 'concluido') {
                if (!grouped[a.data]) grouped[a.data] = { date: a.data, count: 0, revenue: 0 };
                grouped[a.data].count += 1;
                grouped[a.data].revenue += (precosServicos[a.servico] || 0);
            }
        });
        
        const sortedDates = Object.values(grouped).sort((a,b) => {
            return b.date.localeCompare(a.date);
        });
        
        tbody.innerHTML = '';
        if (sortedDates.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 30px;"><i class="fas fa-calendar-times" style="font-size: 24px; color: #cbd5e1; margin-bottom: 10px;"></i><br>Nenhum dia com serviços confirmados.</td></tr>';
        } else {
            sortedDates.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${formatDate(item.date)}</strong></td>
                    <td><span class="badge" style="background: #e0f2fe; color: #0284c7;">${item.count} serviço(s)</span></td>
                    <td><strong>R$ ${item.revenue.toFixed(2).replace('.', ',')}</strong></td>
                `;
                tbody.appendChild(tr);
            });
        }
    };

    // Sidebar Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            tabPanes.forEach(pane => pane.style.display = 'none');
            
            // Add active to clicked
            item.classList.add('active');
            
            // Show corresponding tab
            const targetTab = item.getAttribute('data-tab');
            if (targetTab) {
                document.getElementById(targetTab).style.display = 'block';
                
                // If it's the reports tab, we ensure charts resize correctly
                if (targetTab === 'tab-relatorios' && chartFaturamentoInstance) {
                    chartFaturamentoInstance.resize();
                    chartServicosInstance.resize();
                }
                if (targetTab === 'tab-financeiro' && chartFinOrigemInstance) {
                    chartFinOrigemInstance.resize();
                    chartFinPagamentosInstance.resize();
                }
                
                if (targetTab === 'tab-agenda') {
                    renderAgendaTable();
                }
            }
        });
    });

    // Chart instances
    let chartFaturamentoInstance = null;
    let chartServicosInstance = null;

    const renderCharts = (agendamentos, vendas = []) => {
        if (typeof Chart === 'undefined') return;

        // Set global font
        Chart.defaults.font.family = "'Inter', 'Segoe UI', Roboto, sans-serif";
        Chart.defaults.color = '#64748b'; // Tailwind slate-500

        // 1. Faturamento Diário (agrupado por data)
        const faturamentoPorDia = {};
        
        // Agendamentos Faturamento
        agendamentos.forEach(a => {
            const dataFmt = formatDate(a.data);
            const preco = precosServicos[a.servico] || 0;
            if (a.status === 'concluido') { // So soma se concluido
                if (!faturamentoPorDia[dataFmt]) faturamentoPorDia[dataFmt] = 0;
                faturamentoPorDia[dataFmt] += preco;
            }
        });

        // Vendas Faturamento
        vendas.forEach(v => {
            const dateObj = new Date(v.created_at);
            const dataFmt = dateObj.toLocaleDateString('pt-BR');
            if (!faturamentoPorDia[dataFmt]) faturamentoPorDia[dataFmt] = 0;
            faturamentoPorDia[dataFmt] += parseFloat(v.total || 0);
        });

        // Ordenar as datas
        const datas = Object.keys(faturamentoPorDia).sort((a, b) => {
            const parseDate = d => d.split('/').reverse().join('');
            return parseDate(a).localeCompare(parseDate(b));
        });
        const faturamentos = datas.map(d => faturamentoPorDia[d]);

        if (chartFaturamentoInstance) {
            chartFaturamentoInstance.data.labels = datas.length ? datas : ['Sem dados'];
            chartFaturamentoInstance.data.datasets[0].data = faturamentos.length ? faturamentos : [0];
            chartFaturamentoInstance.update();
        } else {
            const ctxFaturamento = document.getElementById('chartFaturamento').getContext('2d');
            
            // Gradient for Area Chart
            const gradientBar = ctxFaturamento.createLinearGradient(0, 0, 0, 400);
            gradientBar.addColorStop(0, 'rgba(249, 115, 22, 0.8)'); // Orange stronger
            gradientBar.addColorStop(1, 'rgba(249, 115, 22, 0.2)'); // Orange lighter

            chartFaturamentoInstance = new Chart(ctxFaturamento, {
                type: 'bar',
                data: {
                    labels: datas.length ? datas : ['Sem dados'],
                    datasets: [{
                        label: 'Faturamento (R$)',
                        data: faturamentos.length ? faturamentos : [0],
                        backgroundColor: gradientBar,
                        borderColor: '#f97316',
                        borderWidth: 1,
                        borderRadius: 6, // Rounded bars
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 800,
                        easing: 'easeOutQuart'
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            padding: 12,
                            titleFont: { size: 13, weight: 'normal' },
                            bodyFont: { size: 14, weight: 'bold' },
                            callbacks: {
                                label: (context) => ` R$ ${context.parsed.y.toFixed(2).replace('.', ',')}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#f1f5f9',
                                drawBorder: false,
                                borderDash: [5, 5]
                            },
                            ticks: { padding: 10 }
                        },
                        x: {
                            grid: { display: false, drawBorder: false },
                            ticks: { padding: 10 }
                        }
                    }
                }
            });
        }

        // 2. Serviços mais procurados (agrupado por servico)
        const contagemServicos = {};
        agendamentos.forEach(a => {
            const serv = a.servico;
            if (!contagemServicos[serv]) contagemServicos[serv] = 0;
            contagemServicos[serv]++;
        });

        const servicosNomes = Object.keys(contagemServicos);
        const servicosQuantidades = servicosNomes.map(s => contagemServicos[s]);
        
        // Modern SaaS color palette
        const premiumColors = [
            '#3b82f6', // blue-500
            '#10b981', // emerald-500
            '#f59e0b', // amber-500
            '#ec4899', // pink-500
            '#8b5cf6', // violet-500
            '#06b6d4', // cyan-500
            '#64748b'  // slate-500
        ];

        if (chartServicosInstance) {
            chartServicosInstance.data.labels = servicosNomes.length ? servicosNomes : ['Sem dados'];
            chartServicosInstance.data.datasets[0].data = servicosQuantidades.length ? servicosQuantidades : [1];
            chartServicosInstance.data.datasets[0].backgroundColor = servicosNomes.length ? premiumColors : ['#e2e8f0'];
            chartServicosInstance.update();
        } else {
            const ctxServicos = document.getElementById('chartServicos').getContext('2d');
            chartServicosInstance = new Chart(ctxServicos, {
                type: 'doughnut',
                data: {
                    labels: servicosNomes.length ? servicosNomes : ['Sem dados'],
                    datasets: [{
                        data: servicosQuantidades.length ? servicosQuantidades : [1],
                        backgroundColor: servicosNomes.length ? premiumColors : ['#e2e8f0'],
                        borderColor: '#ffffff', // Clean white borders between slices
                        borderWidth: 2,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%', // Sleek ring
                    animation: {
                        duration: 800,
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            padding: 12,
                            bodyFont: { size: 14, weight: 'bold' }
                        }
                    }
                }
            });
        }

        // 3. Atualizar KPIs do Relatório com animação (se possível)
        const totalFaturamento = faturamentos.reduce((a, b) => a + b, 0);
        const totalServicos = agendamentos.length;

        document.getElementById('kpi-faturamento').textContent = `R$ ${totalFaturamento.toFixed(2).replace('.', ',')}`;
        document.getElementById('kpi-servicos').textContent = totalServicos;
    };

    // --- DASHBOARD FINANCEIRO LOGIC ---
    let chartFinOrigemInstance = null;
    let chartFinPagamentosInstance = null;

    const renderFinanceiro = (agendamentos, vendas) => {
        if (typeof Chart === 'undefined') return;
        
        // 1. KPIs
        let totalRecebido = 0;
        let totalPendente = 0;
        let totalTransacoes = 0;
        
        let receitaServicos = 0;
        let receitaProdutos = 0;
        
        const pagamentosCount = {
            'Pix': 0,
            'Cartão': 0,
            'Dinheiro': 0
        };

        // Process Agendamentos
        agendamentos.forEach(a => {
            const preco = precosServicos[a.servico] || 0;
            if (a.status === 'concluido') {
                totalRecebido += preco;
                receitaServicos += preco;
                totalTransacoes++;
            } else {
                totalPendente += preco;
            }
        });

        // Process Vendas
        vendas.forEach(v => {
            const total = parseFloat(v.total || 0);
            totalRecebido += total;
            receitaProdutos += total;
            totalTransacoes++;
            
            // Pagamentos
            const pgto = v.pagamento;
            if (pagamentosCount[pgto] !== undefined) {
                pagamentosCount[pgto] += total;
            } else if (pgto && pgto.includes('Cartão')) {
                pagamentosCount['Cartão'] += total;
            }
        });

        const ticketMedio = totalTransacoes > 0 ? (totalRecebido / totalTransacoes) : 0;

        // Update DOM KPIs
        document.getElementById('kpi-fin-total').textContent = `R$ ${totalRecebido.toFixed(2).replace('.', ',')}`;
        document.getElementById('kpi-fin-pendente').textContent = `R$ ${totalPendente.toFixed(2).replace('.', ',')}`;
        document.getElementById('kpi-fin-ticket').textContent = `R$ ${ticketMedio.toFixed(2).replace('.', ',')}`;

        // Chart 1: Origem da Receita (Bar)
        if (chartFinOrigemInstance) {
            chartFinOrigemInstance.data.datasets[0].data = [receitaServicos, receitaProdutos];
            chartFinOrigemInstance.update();
        } else {
            const ctx = document.getElementById('chartFinOrigem').getContext('2d');
            chartFinOrigemInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Serviços', 'Produtos'],
                    datasets: [{
                        label: 'Receita (R$)',
                        data: [receitaServicos, receitaProdutos],
                        backgroundColor: ['#6366f1', '#8b5cf6'],
                        borderRadius: 6,
                        barPercentage: 0.6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { borderDash: [5,5] } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // Chart 2: Meios de Pagamento (Doughnut)
        const pagLabels = Object.keys(pagamentosCount);
        const pagData = pagLabels.map(l => pagamentosCount[l]);
        
        if (chartFinPagamentosInstance) {
            chartFinPagamentosInstance.data.datasets[0].data = pagData;
            chartFinPagamentosInstance.update();
        } else {
            const ctx = document.getElementById('chartFinPagamentos').getContext('2d');
            chartFinPagamentosInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: pagLabels,
                    datasets: [{
                        data: pagData,
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                        borderWidth: 2,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            });
        }
    };

    // Filter Events
    filterDateInput.addEventListener('change', (e) => {
        renderTable(e.target.value);
    });
    
    filterStatusSelect.addEventListener('change', () => {
        renderTable(filterDateInput.value);
    });

    filterServiceSelect.addEventListener('change', () => {
        renderTable(filterDateInput.value);
    });

    btnToday.addEventListener('click', () => {
        const today = getTodayString();
        filterDateInput.value = today;
        renderTable(today);
    });

    btnAll.addEventListener('click', () => {
        filterDateInput.value = '';
        filterStatusSelect.value = 'todos';
        filterServiceSelect.value = 'todos';
        renderTable(null);
    });

    // Filter Events Vendas
    if (filterDateVendas) {
        filterDateVendas.value = ''; // Default to "Todos" to prevent hiding past sales
        
        filterDateVendas.addEventListener('change', (e) => {
            renderVendasTable(e.target.value);
        });
        
        if (btnTodayVendas) {
            btnTodayVendas.addEventListener('click', () => {
                const today = getTodayString();
                filterDateVendas.value = today;
                renderVendasTable(today);
            });
        }
        
        if (btnAllVendas) {
            btnAllVendas.addEventListener('click', () => {
                filterDateVendas.value = '';
                renderVendasTable(null);
            });
        }
    }

    // --- LOGIN LOGIC ---
    const loginForm = document.getElementById('login-form');
    const loginOverlay = document.getElementById('login-overlay');
    const appLayout = document.getElementById('app-layout');
    const loginError = document.getElementById('login-error');
    const loginUser = document.getElementById('login-user');
    const loginPass = document.getElementById('login-pass');

    const SESSION_KEY = 'petshop_admin_session';
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    // Função para executar quando o login for validado (seja por senha ou por sessão salva)
    const handleLoginSuccess = () => {
        loginError.style.display = 'none';
        loginOverlay.style.display = 'none';
        appLayout.style.display = 'flex';
        
        // Initial data fetch ONLY after login
        renderTable(getTodayString());
        renderVendasTable(filterDateVendas ? filterDateVendas.value : null);
        
        // Start listening to real-time changes
        supabaseClient
            .channel('admin-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'agendamentos' },
                (payload) => {
                    console.log('Real-time update received (agendamentos):', payload);
                    // Re-render table and charts smoothly with new data
                    renderTable(filterDateInput.value);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'vendas' },
                (payload) => {
                    console.log('Real-time update received (vendas):', payload);
                    renderVendasTable();
                    renderTable(filterDateInput.value); // Re-render to update charts
                }
            )
            .subscribe();
    };

    // Helper de Cookies
    const getCookie = (name) => {
        let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (match) return decodeURIComponent(match[2]);
        return null;
    };

    const setCookie = (name, value, days) => {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
    };

    const deleteCookie = (name) => {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
    };

    // Verificar se existe sessão salva ao carregar a página (localStorage ou sessionStorage)
    let savedSession = null;
    let isLocalStorage = false;
    
    try { savedSession = sessionStorage.getItem(SESSION_KEY); } catch(e) {}
    
    if (!savedSession) {
        try { 
            savedSession = localStorage.getItem(SESSION_KEY); 
            isLocalStorage = true;
        } catch(e) {}
    }
    
    if (!savedSession) {
        savedSession = getCookie(SESSION_KEY);
    }

    // FALLBACK INFALÍVEL PARA IDE PREVIEWS:
    // Se a URL contém ?logged_in=true, forçar sessão
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logged_in') === 'true') {
        savedSession = JSON.stringify({ timestamp: new Date().getTime() });
    }

    if (savedSession) {
        try {
            const { timestamp } = JSON.parse(savedSession);
            const now = new Date().getTime();
            
            // Checar se passou menos de 24 horas
            if (now - timestamp < TWENTY_FOUR_HOURS) {
                handleLoginSuccess();
            } else {
                try {
                    if (isLocalStorage) localStorage.removeItem(SESSION_KEY);
                    else sessionStorage.removeItem(SESSION_KEY);
                } catch(e) {}
            }
        } catch (e) {
            try {
                localStorage.removeItem(SESSION_KEY);
                sessionStorage.removeItem(SESSION_KEY);
                deleteCookie(SESSION_KEY);
            } catch(ex) {}
        }
    }

    // --- LOGOUT LOGIC REPOSITION ---
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            try {
                localStorage.removeItem(SESSION_KEY);
                sessionStorage.removeItem(SESSION_KEY);
                deleteCookie(SESSION_KEY);
            } catch(e) {}
            
            // Remover parametro da URL
            try {
                if (window.history.replaceState) {
                    window.history.replaceState({}, '', window.location.pathname);
                }
            } catch (e) {}
            
            window.location.reload(); // Reload page to show login screen
        });
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Mock Auth credentials
        const user = loginUser.value.trim();
        const pass = loginPass.value.trim();
        
        if (user === 'admin' && pass === '123456') {
            const rememberMe = document.getElementById('login-remember').checked;
            const sessionData = JSON.stringify({ timestamp: new Date().getTime() });
            
            // Em previews de IDE (file://), o localStorage às vezes é resetado no F5.
            // O sessionStorage costuma sobreviver ao F5. Vamos salvar em ambos se "Manter conectado".
            try { sessionStorage.setItem(SESSION_KEY, sessionData); } catch(e) {}
            
            if (rememberMe) {
                try { localStorage.setItem(SESSION_KEY, sessionData); } catch(e) {}
                setCookie(SESSION_KEY, sessionData, 1); // Salva no cookie por 1 dia como backup final
            }
            
            // Injetar parametro na URL para sobreviver ao F5 violento do IDE
            try {
                if (window.history.replaceState) {
                    window.history.replaceState({}, '', window.location.pathname + '?logged_in=true');
                }
            } catch (e) {}
            
            handleLoginSuccess();
        } else {
            // Error
            loginError.style.display = 'block';
            loginPass.value = ''; // clear password field
            
            // Shake animation for error
            loginForm.parentElement.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(0)' }
            ], { duration: 400 });
        }
    });

    // Vendas Logic Continua...
    const btnNovaVenda = document.getElementById('btn-nova-venda');
    const modalVenda = document.getElementById('modal-venda');
    const btnCancelVenda = document.getElementById('btn-cancel-venda');
    
    const groupKilos = document.getElementById('group-kilos');
    const groupQtd = document.getElementById('group-qtd');
    const selectPagamento = document.getElementById('venda-pagamento');
    const groupCartao = document.getElementById('group-cartao');
    const selectCartaoTipo = document.getElementById('venda-cartao-tipo');
    // Open/Close Modal
    window.abrirModalVenda = function() {
        console.log("Botão de nova venda clicado!");
        const modal = document.getElementById('modal-venda');
        if (modal) {
            modal.classList.add('show-modal');
        } else {
            alert("Erro: modal-venda não encontrado no HTML!");
        }
    };

    if (btnNovaVenda) {
        btnNovaVenda.addEventListener('click', window.abrirModalVenda);
    }

    const closeModalVenda = () => {
        const modal = document.getElementById('modal-venda');
        if (modal) modal.classList.remove('show-modal');
        formNovaVenda.reset();
        groupKilos.style.display = 'none'; // reset to default
        if (groupQtd) groupQtd.style.display = 'block';
        document.getElementById('venda-qtd').setAttribute('required', 'required');
        if (groupCartao) groupCartao.style.display = 'none';
        if (selectCartaoTipo) selectCartaoTipo.removeAttribute('required');
    };

    if (btnCloseModalVenda) btnCloseModalVenda.addEventListener('click', closeModalVenda);
    if (btnCancelVenda) btnCancelVenda.addEventListener('click', closeModalVenda);

    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target === modalVenda) {
            closeModalVenda();
        }
    });

    // Toggle Kilos field based on Categoria
    if (selectCategoria) {
        selectCategoria.addEventListener('change', (e) => {
            if (e.target.value === 'Ração') {
                groupKilos.style.display = 'block';
                document.getElementById('venda-kilos').setAttribute('required', 'required');
                if (groupQtd) groupQtd.style.display = 'none';
                document.getElementById('venda-qtd').removeAttribute('required');
            } else {
                groupKilos.style.display = 'none';
                document.getElementById('venda-kilos').removeAttribute('required');
                if (groupQtd) groupQtd.style.display = 'block';
                document.getElementById('venda-qtd').setAttribute('required', 'required');
            }
        });
    }

    // Toggle Cartão tipo based on Pagamento
    if (selectPagamento) {
        selectPagamento.addEventListener('change', (e) => {
            if (e.target.value === 'Cartão') {
                groupCartao.style.display = 'block';
                selectCartaoTipo.setAttribute('required', 'required');
            } else {
                groupCartao.style.display = 'none';
                selectCartaoTipo.removeAttribute('required');
            }
        });
    }

    // Handle Form Submit
    if (formNovaVenda) {
        formNovaVenda.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSubmit = formNovaVenda.querySelector('button[type="submit"]');
            const originalText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            btnSubmit.disabled = true;
            
            const categoria = document.getElementById('venda-categoria').value;
            const produto = document.getElementById('venda-produto').value;
            const preco = parseFloat(document.getElementById('venda-preco').value);
            const qtd = document.getElementById('venda-qtd').value ? parseInt(document.getElementById('venda-qtd').value) : null;
            const kilos = document.getElementById('venda-kilos').value ? parseFloat(document.getElementById('venda-kilos').value) : null;
            const pagamento = document.getElementById('venda-pagamento').value;
            const cartaoTipo = document.getElementById('venda-cartao-tipo').value || null;
            
            let total = 0;
            if (categoria === 'Ração' && kilos) {
                total = preco * kilos;
            } else {
                total = preco * (qtd || 1);
            }
            
            try {
                const { error } = await supabaseClient
                    .from('vendas')
                    .insert([{
                        categoria,
                        produto,
                        preco,
                        quantidade: qtd,
                        kilos,
                        pagamento,
                        cartao_tipo: cartaoTipo,
                        total
                    }]);
                    
                if (error) throw error;
                
                // Sucesso
                closeModalVenda();
                renderVendasTable(filterDateVendas ? filterDateVendas.value : null); // Forçar recarregar visualmente
                renderTable(document.getElementById('filter-date').value); // Atualizar gráficos
                
            } catch (error) {
                console.error('Erro ao salvar venda:', error);
                alert(`Erro ao registrar a venda do Supabase: ${error.message || error.details || 'Desconhecido'}. Verifique se a tabela "vendas" existe e se o RLS (Row Level Security) está desativado para testes.`);
            } finally {
                btnSubmit.innerHTML = originalText;
                btnSubmit.disabled = false;
            }
        });
    }

});
