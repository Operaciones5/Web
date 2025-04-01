// URL del archivo CSV generado desde Google Sheets
const CSV_URL = 'https://docs.google.com/spreadsheets/d/12C9OBKWeBLaBTxOzhq9fsr5S3U-fe1MPKJdeYTG7gSE/export?format=csv&id=12C9OBKWeBLaBTxOzhq9fsr5S3U-fe1MPKJdeYTG7gSE&gid=1708695779&range=A2:BX';

// Configuración de columnas modificada para incluir la columna "e" (columna 4)
const COLUMNS_TO_SHOW = [0, 1, 4, 5, 9, 10, 51, 52];
const STATE_COLUMN_INDEX = 51;
const REQUEST_NUMBER_COLUMN_INDEX = 0;
const STATE_DISPLAY_INDEX = 6; // Actualizado porque añadimos una columna antes
const BA_COLUMN_INDEX = 7;

// Datos de la tabla
let tableData = [];
let headers = [];
let requestsChart = null;

// Función para obtener los datos del CSV
async function fetchCSVData() {
    try {
        document.getElementById('total-count').textContent = "Cargando datos...";
        
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error('Error en la red');
        
        const csvText = await response.text();
        const data = parseCSV(csvText);
        
        if (!data || data.length === 0) throw new Error('Datos no válidos');
        
        headers = data[0] || [];
        tableData = data.slice(1) || [];
        
        populateTable(tableData);
        updateTotalCount(tableData.length);
        
    } catch (error) {
        console.error('Error al cargar los datos:', error);
        document.getElementById('total-count').textContent = "Error al cargar datos";
    }
}

// Función para parsear CSV mejorada
function parseCSV(csvText) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentField.trim());
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }
    
    // Añadir la última fila
    if (currentField.trim() !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }
    
    return rows;
}

// Función para contar solicitudes por estado (modificada para incluir cancelados)
function countRequestsByStatus() {
    let openCount = 0;
    let closedCount = 0;
    let cancelledCount = 0;

    tableData.forEach(row => {
        const estado = String(row[STATE_COLUMN_INDEX] || '').toLowerCase();
        if (estado.includes('abierto')) {
            openCount++;
        } else if (estado.includes('cerrado')) {
            closedCount++;
        } else if (estado.includes('cancelado')) {
            cancelledCount++;
        }
    });

    return { openCount, closedCount, cancelledCount };
}

// Función para crear el gráfico (actualizada con categoría cancelados)
function createRequestsChart() {
    const { openCount, closedCount, cancelledCount } = countRequestsByStatus();
    const ctx = document.getElementById('requests-chart').getContext('2d');
    
    if (requestsChart) {
        requestsChart.destroy();
    }
    
    requestsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Abiertas', 'Cerradas', 'Canceladas'],
            datasets: [{
                data: [openCount, closedCount, cancelledCount],
                backgroundColor: [
                    'rgba(95, 143, 255, 0.8)',  // Azul para abiertas
                    'rgba(0, 143, 95, 0.8)',    // Verde para cerradas
                    'rgba(220, 53, 69, 0.8)'    // Rojo para canceladas
                ],
                borderColor: [
                    'rgba(95, 143, 255, 1)',
                    'rgba(0, 143, 95, 1)',
                    'rgba(220, 53, 69, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

// Función para mostrar el modal con el gráfico
function showChartModal() {
    createRequestsChart();
    const modal = document.getElementById('chart-modal');
    modal.style.display = 'block';
}

// Función para cerrar el modal
function closeChartModal() {
    const modal = document.getElementById('chart-modal');
    modal.style.display = 'none';
}

// Función para actualizar el contador total
function updateTotalCount(count) {
    const countElement = document.getElementById('total-count');
    if (count === 0) {
        countElement.textContent = "No hay solicitudes";
    } else {
        countElement.textContent = `${count} solicitud${count !== 1 ? 'es' : ''}`;
    }
}

// Función para rellenar la tabla con mejor formato
function populateTable(data) {
    const table = document.getElementById('data-table');
    const thead = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');

    // Limpiar contenido existente
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Crear encabezados con formato mejorado
    if (headers.length > 0) {
        COLUMNS_TO_SHOW.forEach(index => {
            if (headers[index]) {
                const th = document.createElement('th');
                th.textContent = headers[index];
                thead.appendChild(th);
            }
        });
    }

    // Crear filas de datos con mejor formato
    if (data.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = COLUMNS_TO_SHOW.length;
        td.textContent = "No se encontraron solicitudes";
        td.style.textAlign = "center";
        td.style.padding = "2rem";
        td.style.color = "var(--text-light)";
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            COLUMNS_TO_SHOW.forEach((colIndex, displayIndex) => {
                const td = document.createElement('td');
                let cellContent = row[colIndex] || '';
                
                // Formatear celda de estado
                if (displayIndex === STATE_DISPLAY_INDEX) {
                    const estado = String(cellContent).trim().toLowerCase();
                    const badge = document.createElement('span');
                    
                    if (estado.includes('cerrado')) {
                        badge.className = 'status-badge status-closed';
                    } else if (estado.includes('abierto')) {
                        badge.className = 'status-badge status-open';
                    } else if (estado.includes('cancelado')) {
                        badge.className = 'status-badge status-cancelled';
                    } else {
                        badge.className = 'status-badge';
                        badge.style.backgroundColor = 'var(--gray-light)';
                        badge.style.color = 'var(--text-color)';
                    }
                    
                    badge.textContent = estado;
                    td.appendChild(badge);
                } else {
                    // Formatear otras celdas
                    td.textContent = cellContent;
                    
                    // Resaltar números de solicitud
                    if (displayIndex === 0) {
                        td.style.fontWeight = "500";
                        td.style.color = "var(--primary-color)";
                    }
                }
                
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
    }

    // Actualizar contador
    updateTotalCount(data.length);
}

// Función de búsqueda mejorada
function searchTable() {
    const searchValue = document.getElementById('search-bar').value.trim().toLowerCase();
    
    if (!searchValue) {
        populateTable(tableData);
        return;
    }
    
    const filteredData = tableData.filter(row => {
        // Buscar en múltiples campos
        return COLUMNS_TO_SHOW.some(index => {
            const cellValue = row[index] ? String(row[index]).toLowerCase() : '';
            return cellValue.includes(searchValue);
        });
    });

    populateTable(filteredData);
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    fetchCSVData();
    
    // Configurar eventos del gráfico
    document.getElementById('chart-button').addEventListener('click', showChartModal);
    document.querySelector('.close-modal').addEventListener('click', closeChartModal);
    
    // Cerrar modal al hacer clic fuera del contenido
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('chart-modal');
        if (event.target === modal) {
            closeChartModal();
        }
    });
    
    // Opcional: Actualizar datos cada 5 minutos
    // setInterval(fetchCSVData, 300000);
});