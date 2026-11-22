// pages/profile.jsx
function Profile({ name, role, skills }) {
  return (
    <div>
      <h1>{name}</h1>
      <h1>{role}</h1>
      <h1>{skills}</h1>
    </div>
  )
}

export default Profile