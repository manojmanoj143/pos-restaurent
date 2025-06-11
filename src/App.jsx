import { BrowserRouter, Route, Routes } from 'react-router-dom';
import UserRouter from './Routes/UserRouter'; // Adjust path as needed
import { UserProvider } from './Context/UserContext'; // Adjust path as needed

function App() {
    return (
        <>
            <UserProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/*" element={<UserRouter />} />
                    </Routes>
                </BrowserRouter>
            </UserProvider>
        </>
    );
}

export default App;