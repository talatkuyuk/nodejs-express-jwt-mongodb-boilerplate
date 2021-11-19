window.addEventListener('load', async (event) => {
	await new Promise(resolve => setTimeout(resolve, 500)).then(() => {
		const input = document.querySelector(".download-url-input");
		const value = `${window.location.origin}/swagger.json`;
		input && (input.placeholder = value);
	});
});