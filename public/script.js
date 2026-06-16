// ============================================================
// NayePankh Volunteer Registration — Public Form Logic
// ============================================================

const areasGrid = document.getElementById('areasGrid');
const form = document.getElementById('volunteerForm');
const submitBtn = document.getElementById('submitBtn');
const alertBox = document.getElementById('formAlert');
const thankYouCard = document.getElementById('thankYouCard');

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `np-alert np-alert-${type} is-visible`;
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideAlert() {
  alertBox.className = 'np-alert';
}

// Load areas of interest dynamically from the server
async function loadAreas() {
  try {
    const res = await fetch('/api/areas');
    const data = await res.json();
    areasGrid.innerHTML = '';
    data.areas.forEach((area, i) => {
      const label = document.createElement('label');
      label.className = 'np-checkbox';
      label.innerHTML = `
        <input type="checkbox" name="areasOfInterest" value="${area}" id="area-${i}" />
        <span>${area}</span>
      `;
      areasGrid.appendChild(label);
    });
  } catch (err) {
    areasGrid.innerHTML = '<p style="color: var(--np-danger); font-size: 13px;">Could not load areas of interest. Please refresh the page.</p>';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const formData = new FormData(form);
  const areasOfInterest = formData.getAll('areasOfInterest');

  const payload = {
    fullName: formData.get('fullName')?.trim(),
    email: formData.get('email')?.trim(),
    phone: formData.get('phone')?.trim(),
    age: formData.get('age'),
    city: formData.get('city')?.trim(),
    areasOfInterest,
    availability: formData.get('availability')?.trim(),
    message: formData.get('message')?.trim() || ''
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/volunteers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert(data.error || 'Something went wrong. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Register as Volunteer';
      return;
    }

    form.style.display = 'none';
    document.querySelector('.np-card #formAlert').className = 'np-alert';
    document.querySelector('.np-page > .np-card').style.display = 'none';
    thankYouCard.style.display = 'block';
    thankYouCard.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showAlert('Could not connect to the server. Please check your connection and try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register as Volunteer';
  }
});

loadAreas();
