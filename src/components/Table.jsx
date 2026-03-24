import { useState } from 'react';
import styles from './Table.module.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Table({ columns, data, itemsPerPage = 5, renderRowActions }) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  const currentData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index}>{col.header}</th>
            ))}
            {renderRowActions && <th>Acțiuni</th>}
          </tr>
        </thead>
        <tbody>
          {currentData.length > 0 ? (
            currentData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex}>
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
                {renderRowActions && (
                  <td>
                    <div className={styles.actions}>
                      {renderRowActions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + (renderRowActions ? 1 : 0)} className={styles.emptyState}>
                Nu există date disponibile.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Se afișează de la {(currentPage - 1) * itemsPerPage + 1} la {Math.min(currentPage * itemsPerPage, data.length)} din {data.length} înregistrări
          </span>
          <div className={styles.pageControls}>
            <button 
              className={styles.pageBtn} 
              onClick={handlePrev} 
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span className={styles.pageNumber}>Pagina {currentPage} din {totalPages}</span>
            <button 
              className={styles.pageBtn} 
              onClick={handleNext} 
             disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
