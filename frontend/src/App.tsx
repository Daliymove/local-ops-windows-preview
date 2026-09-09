import { ModalProvider } from './context/ModalProvider';
import { Shell } from './components/layout/Shell';

export function App() {
  return (
    <ModalProvider>
      <Shell />
    </ModalProvider>
  );
}

export default App;
