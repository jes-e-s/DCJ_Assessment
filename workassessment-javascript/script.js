// Message constants
const messageList = {
  fileUploadSuccess: " events successfully loaded.",
  fileUploadError: "Error uploading file.",
  noFileSelected: "No file selected. Please select a file to upload.",
  invalidFileFormat: "Invalid file format. Please upload a valid JSON file.",
  noEventsToDisplay: "No events to display. Please upload a JSON file.",
  eventsCleared: "Events cleared.",
  filtersCleared: "Filters cleared.",
  filterApplied: "Filters applied.",
};

// Pagination constants
const ITEMS_PER_PAGE = 6; // Number of cards per page
let currentPage = 1;

// Log events with timestamp
function logEvents(group, message) {
  console.group("Log " + group + " - " + new Date().toISOString());
  console.log(message);
  console.groupEnd();
}

// Update upload form message display
function updateMessage(message, isValid = false) {
  const uploadMessage = document.querySelector("#uploadMessage");
  if (isValid)
    uploadMessage.classList = uploadMessage.classList + " text-success";
  else uploadMessage.classList = uploadMessage.classList + " text-error";
  uploadMessage.textContent = message;
}

// Validate each event object in the uploaded JSON file
function validateEventObject(eventEntry, index, errorIndexes) {
  let isValid = true;
  const requiredProperties = ["event", "date"];

  // Check if eventEntry is an object
  if (typeof eventEntry !== "object" || eventEntry === null) {
    errorIndexes.push(index + 1);
    isValid = false;
  }
  // Define required properties for each event object; event name and date for searching
  requiredProperties.every((prop) => {
    if (
      !eventEntry.hasOwnProperty(prop) ||
      eventEntry[prop] === null ||
      eventEntry[prop] === ""
    ) {
      errorIndexes.push(index + 1);
      isValid = false;
      return false;
    } else {
      return true;
    }
  });
  return isValid;
}

// Handle file upload
function uploadFile(e) {
  e.preventDefault();

  const fileInput = document.getElementById("jsonFile");
  const file = fileInput.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const eventData = JSON.parse(e.target.result);
        // Error handling (check if eventData is an array)
        if (!Array.isArray(eventData)) {
          throw new Error(messageList.invalidFileFormat);
        }
        const errorIndexes = [];
        const validEvents = [];
        eventData.forEach((event, index) => {
          if (validateEventObject(event, index, errorIndexes)) {
            // only push valid events
            validEvents.push(event);
          }
        });

        sessionStorage.setItem("eventData", JSON.stringify(validEvents));
        updateMessage(
          (eventData.length - errorIndexes.length).toString() +
            messageList.fileUploadSuccess,
          true
        );

        logEvents(
          "File Upload",
          eventData.length -
            errorIndexes.length +
            " valid events loaded from total " +
            eventData.length +
            "."
        );
        clearFilters();
        displayEvents();
      } catch (error) {
        logEvents("File Upload", error);
      }
    };
    reader.onerror = function (e) {
      logEvents("File Upload", "Error reading file");
    };
    reader.readAsText(file);
  } else {
    updateMessage(messageList.noFileSelected, false);
    console.error("No file selected");
  }
  return false;
}

// Display events in the UI
function displayEvents() {
  resetEventsContainer();
  toggleLoader(true);

  const eventListContainer = document.querySelector("#eventList");
  let templateSupported = true;
  if (!"content" in document.createElement("template")) {
    templateSupported = false;
  }

  const eventList = retrieveEvents();

  // Calculate pagination
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pagedEventList = eventList.slice(startIndex, endIndex);
  const paginationInfo = document.getElementById("paginationInfo");
  if (eventList.length > 0) {
    const displayStart = startIndex + 1;
    const displayEnd = Math.min(endIndex, eventList.length);
    paginationInfo.textContent = `Displaying ${displayStart} to ${displayEnd} out of ${eventList.length} Events`;
  } else {
    paginationInfo.textContent = "";
  }
  // Set timeout to better show loading dataset
  setTimeout(() => {
    if (eventList.length > 0) {
      pagedEventList.forEach((element) => {
        const eventName = element.event.trim();
        const eventDate = new Date(element.date);
        const eventLocation = element.location.trim();
        const eventDistrict = element.district.trim();
        const eventType = element.type ? element.type.trim() : "";
        if (templateSupported) {
          // Use template to create card elements
          const cardTemplate = document.querySelector("#eventCardTemplate");
          const card = cardTemplate.content.cloneNode(true);

          card.querySelector("h3").textContent = eventName;
          card
            .querySelector("time")
            .setAttribute("datetime", eventDate.toISOString().split("T")[0]);
          card.querySelector("time").textContent = eventDate.toDateString();
          card.querySelectorAll("span")[0].textContent = eventLocation;
          card.querySelectorAll("span")[1].textContent = eventDistrict;
          card.querySelectorAll("span")[2].textContent = eventType;
          eventListContainer.appendChild(card);
        } else {
          logEvents("Load Events", "Your browser does not support templates");
          // Create card elements manually
          const li = document.createElement("li");
          li.className = "card mb-3";

          const article = document.createElement("article");
          article.className = "card-body";

          const h3 = document.createElement("h3");
          h3.className = "card-title";
          h3.textContent = eventName;

          const time = document.createElement("time");
          time.className = "card-text";
          time.setAttribute("datetime", eventDate.toISOString().split("T")[0]);
          time.textContent = eventDate.toDateString();

          const span = document.createElement("span");
          span.className = "card-subtitle mb-2 text-muted";
          span.textContent = eventLocation;

          const p = document.createElement("p");
          p.className = "card-text";
          p.textContent = eventType;

          // Assemble card
          article.appendChild(h3);
          article.appendChild(time);
          article.appendChild(span);
          article.appendChild(p);
          li.appendChild(article);

          eventListContainer.appendChild(li);
        }
      });
      // Setup pagination after adding cards
      setupPagination(eventList.length);
    } else {
      updateMessage(messageList.noEventsToDisplay, false);
      logEvents("Load Events", "No events found in session storage.");
    }
    toggleLoader(false);
  }, 500);
}

function resetEventsContainer() {
  const eventListContainer = document.querySelector("#eventList");
  eventListContainer.innerHTML = "";
}

function filterEvents() {
  resetPagination();
  updateMessage("");
  displayEvents();
  logEvents("Filter Events", "Filters applied.");
}

function showAllEvents() {
  clearFilters();
  resetPagination();
  displayEvents();
  logEvents("Show All Events", "Filters cleared.");
}

function clearEvents() {
  sessionStorage.removeItem("eventData");
  resetEventsContainer();
  document.getElementById("uploadForm").reset();
  clearFilters();
  resetPagination();
  updateMessage(messageList.eventsCleared, true);
  logEvents("Clear Events", "Events cleared from session storage.");
}

function clearFilters() {
  document.getElementById("eventsFilter").reset();
}

function retrieveEvents() {
  const filters = {
    name: document.getElementById("eventFilter").value || "",
    date: document.getElementById("dateFilter").value || "",
  };
  applyFilters = (obj) => {
    if (
      obj.event.toLowerCase().includes(filters.name.toLowerCase()) &&
      (filters.date != ""
        ? obj.date === new Date(filters.date).toDateString()
        : true)
    ) {
      return true;
    } else {
      return false;
    }
  };

  const eventList = JSON.parse(sessionStorage.getItem("eventData")) || [];
  return eventList.filter(applyFilters);
}

// Show or hide loader
function toggleLoader(show = true) {
  const eventListContainer = document.querySelector("#eventList");

  if (show) {
    // Clear existing content
    eventListContainer.innerHTML = "";

    // Create loader elements
    const loaderContainer = document.createElement("div");
    loaderContainer.className = "loader-container text-center p-5";

    const spinner = document.createElement("div");
    spinner.className = "spinner-border text-primary";
    spinner.setAttribute("role", "status");

    const srText = document.createElement("span");
    srText.className = "visually-hidden";
    srText.textContent = "Loading...";

    const loadingText = document.createElement("p");
    loadingText.className = "mt-2 text-muted";
    loadingText.textContent = "Loading events...";

    // Assemble loader
    spinner.appendChild(srText);
    loaderContainer.appendChild(spinner);
    loaderContainer.appendChild(loadingText);
    eventListContainer.appendChild(loaderContainer);
  } else {
    // Remove loader if exists
    const loader = eventListContainer.querySelector(".loader-container");
    if (loader) {
      loader.remove();
    }
  }
}

function setupPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = "";

  // Previous button
  const prevLi = document.createElement("li");
  prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
  const prevLink = document.createElement("a");
  prevLink.className = "page-link";
  prevLink.href = "#";
  prevLink.setAttribute("aria-label", "Previous");
  prevLink.innerHTML = '<span aria-hidden="true">&laquo;</span>';
  prevLink.onclick = (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      displayEvents();
    }
  };
  prevLi.appendChild(prevLink);
  paginationContainer.appendChild(prevLi);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${currentPage === i ? "active" : ""}`;
    const link = document.createElement("a");
    link.className = "page-link";
    link.href = "#";
    link.textContent = i;
    link.onclick = (e) => {
      e.preventDefault();
      currentPage = i;
      displayEvents();
    };
    li.appendChild(link);
    paginationContainer.appendChild(li);
  }

  // Next button
  const nextLi = document.createElement("li");
  nextLi.className = `page-item ${
    currentPage === totalPages ? "disabled" : ""
  }`;
  const nextLink = document.createElement("a");
  nextLink.className = "page-link";
  nextLink.href = "#";
  nextLink.setAttribute("aria-label", "Next");
  nextLink.innerHTML = '<span aria-hidden="true">&raquo;</span>';
  nextLink.onclick = (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      displayEvents();
    }
  };
  nextLi.appendChild(nextLink);
  paginationContainer.appendChild(nextLi);
}

function setupPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = "";

  // Previous button
  const prevLi = document.createElement("li");
  prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
  const prevLink = document.createElement("a");
  prevLink.className = "page-link";
  prevLink.href = "#";
  prevLink.setAttribute("aria-label", "Previous");
  prevLink.innerHTML = '<span aria-hidden="true">&laquo;</span>';
  prevLink.onclick = (e) => {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      displayEvents();
    }
  };
  prevLi.appendChild(prevLink);
  paginationContainer.appendChild(prevLi);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${currentPage === i ? "active" : ""}`;
    const link = document.createElement("a");
    link.className = "page-link";
    link.href = "#";
    link.textContent = i;
    link.onclick = (e) => {
      e.preventDefault();
      currentPage = i;
      displayEvents();
    };
    li.appendChild(link);
    paginationContainer.appendChild(li);
  }

  // Next button
  const nextLi = document.createElement("li");
  nextLi.className = `page-item ${
    currentPage === totalPages ? "disabled" : ""
  }`;
  const nextLink = document.createElement("a");
  nextLink.className = "page-link";
  nextLink.href = "#";
  nextLink.setAttribute("aria-label", "Next");
  nextLink.innerHTML = '<span aria-hidden="true">&raquo;</span>';
  nextLink.onclick = (e) => {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      displayEvents();
    }
  };
  nextLi.appendChild(nextLink);
  paginationContainer.appendChild(nextLi);
}

function resetPagination() {
  currentPage = 1;
  document.getElementById("pagination").innerHTML = "";
}
