function getTickets() {
    return JSON.parse(localStorage.getItem("tickets")) || [];
}

function saveTickets(tickets) {
    localStorage.setItem("tickets", JSON.stringify(tickets));
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, function (character) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character];
    });
}

function formatDate(dateValue) {
    if (!dateValue) return "Not available";
    return new Date(dateValue).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

// Report problem
const reportForm = document.getElementById("report-form");
if (reportForm) {
    reportForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const location = document.getElementById("location").value;
        const category = document.getElementById("category").value;
        const priority = document.getElementById("priority").value;
        const device = document.getElementById("device").value.trim();
        const description = document.getElementById("description").value.trim();
        const formMessage = document.getElementById("form-message");

        if (!location || !category || !priority || !device || !description) {
            formMessage.textContent = "Please complete all fields before submitting your ticket.";
            return;
        }
        formMessage.textContent = "";

        let ticketNumber = Number(localStorage.getItem("ticketNumber")) || 1;
        const ticketId = "IT-" + String(ticketNumber).padStart(4, "0");
        const ticket = {
            id: ticketId,
            location: location,
            category: category,
            priority: priority,
            device: device,
            description: description,
            status: "Open",
            createdAt: new Date().toISOString()
        };
        const tickets = getTickets();
        tickets.push(ticket);
        saveTickets(tickets);
        localStorage.setItem("ticketNumber", String(ticketNumber + 1));

        document.getElementById("ticket-number").textContent = ticketId;
        reportForm.style.display = "none";
        document.getElementById("confirmation").style.display = "block";
    });
}

// Dashboard
const activeTicketsContainer = document.getElementById("active-tickets");
const closedTicketsContainer = document.getElementById("closed-tickets");
let dashboardView = "active";

function ticketCard(ticket, tickets) {
    const card = document.createElement("article");
    const priorityClass = "priority-" + (ticket.priority || "Medium").toLowerCase();
    card.className = "ticket";
    card.innerHTML = `
        <div class="ticket-header">
            <h3>${escapeHtml(ticket.id)}</h3>
            <div class="ticket-badges">
                <span class="priority-badge ${priorityClass}">${escapeHtml(ticket.priority || "Medium")}</span>
                <span class="status-badge">${escapeHtml(ticket.status)}</span>
            </div>
        </div>
        <div class="ticket-meta"><span>${escapeHtml(ticket.category || "Other")}</span><span>Submitted ${formatDate(ticket.createdAt)}</span></div>
        <p><strong>Location:</strong> ${escapeHtml(ticket.location)}</p>
        <p><strong>Device:</strong> ${escapeHtml(ticket.device)}</p>
        <p><strong>Problem:</strong> ${escapeHtml(ticket.description)}</p>
        ${ticket.status === "Closed" ? "" : `
            <div class="ticket-actions">
                <label>Update Status</label>
                <select class="status-select" aria-label="Update status for ${escapeHtml(ticket.id)}">
                    ${["Open", "Pending", "In Progress", "Resolved"].map(function (status) {
                        return `<option ${ticket.status === status ? "selected" : ""}>${status}</option>`;
                    }).join("")}
                </select>
            </div>`}
    `;
    const statusSelect = card.querySelector(".status-select");
    if (statusSelect) {
        statusSelect.addEventListener("change", function () {
            ticket.status = this.value === "Resolved" ? "Closed" : this.value;
            saveTickets(tickets);
            renderDashboard();
        });
    }
    return card;
}

function emptyState(message) {
    const element = document.createElement("div");
    element.className = "empty-state";
    element.textContent = message;
    return element;
}

function renderDashboard() {
    if (!activeTicketsContainer || !closedTicketsContainer) return;
    const tickets = getTickets();
    const query = (document.getElementById("ticket-search").value || "").trim().toLowerCase();
    const priority = document.getElementById("priority-filter").value;
    const category = document.getElementById("category-filter").value;
    const filtered = tickets.filter(function (ticket) {
        const haystack = [ticket.id, ticket.location, ticket.device, ticket.description, ticket.category].join(" ").toLowerCase();
        return (!query || haystack.includes(query)) && (!priority || ticket.priority === priority) && (!category || ticket.category === category);
    });
    const active = filtered.filter(function (ticket) { return ticket.status !== "Closed"; });
    const closed = filtered.filter(function (ticket) { return ticket.status === "Closed"; });

    activeTicketsContainer.innerHTML = "";
    closedTicketsContainer.innerHTML = "<h3>Closed Tickets</h3>";
    activeTicketsContainer.hidden = dashboardView !== "active";
    closedTicketsContainer.hidden = dashboardView !== "closed";
    document.getElementById("ticket-count").textContent = filtered.length + (filtered.length === 1 ? " ticket" : " tickets");
    document.getElementById("summary-total").textContent = tickets.length;
    document.getElementById("summary-open").textContent = tickets.filter(function (ticket) { return ticket.status === "Open"; }).length;
    document.getElementById("summary-pending").textContent = tickets.filter(function (ticket) { return ticket.status === "Pending" || ticket.status === "In Progress"; }).length;
    document.getElementById("summary-closed").textContent = tickets.filter(function (ticket) { return ticket.status === "Closed"; }).length;
    activeTicketsContainer.appendChild(active.length ? document.createDocumentFragment() : emptyState(query || priority || category ? "No tickets match these filters." : "No active tickets yet."));
    active.forEach(function (ticket) { activeTicketsContainer.appendChild(ticketCard(ticket, tickets)); });
    closedTicketsContainer.appendChild(closed.length ? document.createDocumentFragment() : emptyState(query || priority || category ? "No closed tickets match these filters." : "No closed tickets yet."));
    closed.forEach(function (ticket) { closedTicketsContainer.appendChild(ticketCard(ticket, tickets)); });
}

if (activeTicketsContainer) {
    ["ticket-search", "priority-filter", "category-filter"].forEach(function (id) {
        document.getElementById(id).addEventListener("input", renderDashboard);
        document.getElementById(id).addEventListener("change", renderDashboard);
    });
    ["active-tab", "closed-tab"].forEach(function (id) {
        document.getElementById(id).addEventListener("click", function () {
            dashboardView = id === "active-tab" ? "active" : "closed";
            document.getElementById("active-tab").classList.toggle("is-active", dashboardView === "active");
            document.getElementById("closed-tab").classList.toggle("is-active", dashboardView === "closed");
            document.getElementById("active-tab").setAttribute("aria-selected", String(dashboardView === "active"));
            document.getElementById("closed-tab").setAttribute("aria-selected", String(dashboardView === "closed"));
            renderDashboard();
        });
    });
    document.getElementById("reset-demo-data").addEventListener("click", function () {
        const shouldReset = window.confirm("Reset all demo tickets? This cannot be undone.");
        if (!shouldReset) return;
        localStorage.removeItem("tickets");
        localStorage.removeItem("ticketNumber");
        dashboardView = "active";
        document.getElementById("active-tab").classList.add("is-active");
        document.getElementById("closed-tab").classList.remove("is-active");
        document.getElementById("active-tab").setAttribute("aria-selected", "true");
        document.getElementById("closed-tab").setAttribute("aria-selected", "false");
        renderDashboard();
    });
    renderDashboard();
}

// Track ticket
const trackForm = document.getElementById("track-form");
const ticketResult = document.getElementById("ticket-result");
if (trackForm) {
    trackForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const ticketId = document.getElementById("ticket-id").value.trim().toUpperCase();
        const ticket = getTickets().find(function (item) { return item.id === ticketId; });
        if (!ticket) {
            ticketResult.innerHTML = '<div class="empty-state">Ticket not found. Please check the ticket ID and try again.</div>';
            return;
        }
        const statuses = ["Open", "Pending", "In Progress", "Closed"];
        const currentStatusIndex = statuses.indexOf(ticket.status);
        ticketResult.innerHTML = `
            <h3>Ticket ${escapeHtml(ticket.id)}</h3>
            <div class="ticket-meta"><span>${escapeHtml(ticket.category || "Other")}</span><span>${escapeHtml(ticket.priority || "Medium")} priority</span><span>Submitted ${formatDate(ticket.createdAt)}</span></div>
            <p><strong>Location:</strong> ${escapeHtml(ticket.location)}</p>
            <p><strong>Device:</strong> ${escapeHtml(ticket.device)}</p>
            <p><strong>Problem:</strong> ${escapeHtml(ticket.description)}</p>
            <div class="status-timeline">${statuses.map(function (status, index) {
                const className = index < currentStatusIndex ? "completed" : index === currentStatusIndex ? "current" : "";
                return `<div class="status ${className}"><span>${index <= currentStatusIndex ? "✓" : "○"}</span><p>${status}</p></div>`;
            }).join("")}</div>`;
    });
}
