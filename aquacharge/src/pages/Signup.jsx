import React, {useState} from "react";

const Signup = ({ onBackToLogin }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [type, setType] = useState('vessel_owner');
    const [error, setError] = useState('');
    
    const disabled = !firstName || !lastName || !email || !password || !type;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:3002/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    type: type,
                    first_name: firstName,
                    last_name: lastName,
                    password: password,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                onBackToLogin();
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch (err) {
            setError('Could not connect to the server');
        }
    };
  return (
    <div className="Signup">   
        <h1>Signup Page</h1>
        <form onSubmit={handleSubmit}>
            <input type="text" placeholder="First Name" className="mb-2 p-2 border border-gray-300 rounded w-full" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input type="text" placeholder="Last Name" className="mb-2 p-2 border border-gray-300 rounded w-full" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <input type="text" placeholder="Email" className="mb-2 p-2 border border-gray-300 rounded w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="mb-4 p-2 border border-gray-300 rounded w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
            <select className="mb-4 p-2 border border-gray-300 rounded w-full" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="vessel_owner">Vessel Owner</option>
                <option value="port_operator">Port Operator</option>
            </select>
            <button type="submit" disabled={disabled} className="w-full px-4 py-2 bg-green-500 text-white rounded">
                Signup
            </button>
        </form>
        {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}

export default Signup;