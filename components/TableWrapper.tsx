const TableWrapper = ({ children, ...rest }) => {
  return (
    <div className="w-full overflow-x-auto" {...rest}>
      <table>{children}</table>
    </div>
  )
}

export default TableWrapper
