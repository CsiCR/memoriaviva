async function main() {
  const submissionData = new FormData();
  
  // Aportante
  submissionData.append('dni', '12345678');
  submissionData.append('full_name', 'Vecino Test');
  submissionData.append('phone', '297123456');
  submissionData.append('email', 'test@picotruncado.org');
  submissionData.append('relation_to_city', 'Vecino Residente');
  submissionData.append('neighborhood_or_institution', 'Barrio YPF');
  submissionData.append('comments', 'Test de diagnostico');
  submissionData.append('allow_contact', 'true');

  // Aporte
  submissionData.append('title', 'Aporte de Prueba Diagnostico');
  submissionData.append('contribution_type', 'Fotografía');
  submissionData.append('description', 'Una descripcion de prueba.');
  submissionData.append('related_place', 'Pico Truncado');
  submissionData.append('authorization_level', 'A');
  submissionData.append('credit_preference', 'Nombre completo');
  submissionData.append('owns_or_has_permission', 'true');
  submissionData.append('accepts_cataloging', 'true');

  // Add a 10MB file
  const buffer = Buffer.alloc(10 * 1024 * 1024, 'a'); // 10MB
  const blob = new Blob([buffer], { type: 'image/png' });
  submissionData.append('files', blob, 'test_image.png');

  console.log('Sending request to http://localhost:3000/api/contribute...');
  
  try {
    const response = await fetch('http://localhost:3000/api/contribute', {
      method: 'POST',
      body: submissionData,
    });

    console.log('Response Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    console.log('Response Content-Type:', response.headers.get('content-type'));
    
    const text = await response.text();
    console.log('Response Body:', text);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

main().catch(console.error);
