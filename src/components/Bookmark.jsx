const Bookmark = ({ title, content, cardClass, listClass }) => {

  return (
    <div className={cardClass || "bg-primary text-primary-foreground rounded-xl col-span-1 h-36 w-36 overflow-y-auto border border-border/50 shadow-lg"}>
      <ul className={`${listClass || ""} text-left text-primary-foreground m-0 pl-5 pt-1 relative list-none mb-2`}>
        <li className="font-black text-lg underline underline-offset-4 decoration-2 text-center">{ title }</li>
        {content.map(({name, url}, key) => (
            <li key={key}><a href={url}>{name}</a></li>
        ))}
      </ul>
    </div>
  );
}
export default Bookmark;
