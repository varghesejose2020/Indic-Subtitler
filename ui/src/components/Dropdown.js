export default function Dropdown({ label, options = [], onChange }) {
  const handleSelectChange = (event) => {
    const value = event.target.value;
    onChange(value);
  };
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:gap-2 ">
      <label htmlFor="language-select" className="font-medium">
        {label}:
      </label>
      <select
        onChange={handleSelectChange}
        className="mt-1 border-2 lg:w-[60%] text-lg px-2 py-2 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring focus-visible:ring-primary-300 transition-all transition-75"
      >
        <option disabled selected>
          Select language
        </option>
        {options?.map((element) => (
          <option id={element.id} value={element.id} key={element.id}>
            {element.name}
          </option>
        ))}
      </select>
    </div>
  );
}
