document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('userList');
  const data = await apiGet('/users/');
  list.innerHTML = data.map(u => `
    <div>
      ${u.username} - ${u.email} - ${u.role}
      <button onclick="lockUser(${u.id})">Khóa</button>
    </div>
  `).join('');
});

async function lockUser(id) {
  await fetch(`${apiBase}/users/${id}/`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: false })
  });
  alert("Đã khóa tài khoản.");
  location.reload();
}