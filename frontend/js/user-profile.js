document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch(`${apiBase}/users/current_user/`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
    });

    const json = await res.json();
    const user = json.data;

    // Hiển thị thông tin
    document.getElementById('fullName').textContent = `${user.first_name} ${user.last_name}`;
    document.getElementById('username').textContent = user.username;
    document.getElementById('email').textContent = user.email;
    document.getElementById('role').textContent = getRoleName(user.role);
    document.getElementById('avatar').src = `${cloudinaryBase}/${user.avatar}`;

    // Nút đăng xuất
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('access_token');
      window.location.href = '/login/';
    });

    // Nút chỉnh sửa
    
    document.querySelector('.btn.edit').addEventListener('click', () => {
    window.location.href = `user-update-delete.html?id=${user.id}`;
    });
  } catch (error) {
    console.error('Lỗi khi tải thông tin người dùng:', error);
  }

});

// Hàm map role id -> tên vai trò
function getRoleName(roleId) {
  switch (roleId) {
    case 1: return 'Quản trị viên';
    case 2: return 'Nhà tổ chức';
    case 3: return 'Người dùng';
    default: return 'Không xác định';
  }
}
