--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: book_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.book_status AS ENUM (
    'available',
    'loaned',
    'reserved',
    'maintenance',
    'lost'
);


ALTER TYPE public.book_status OWNER TO postgres;

--
-- Name: loan_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.loan_status AS ENUM (
    'active',
    'completed',
    'overdue'
);


ALTER TYPE public.loan_status OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(100) NOT NULL,
    password text NOT NULL,
    token_version integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admins OWNER TO postgres;

--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admins_id_seq OWNER TO postgres;

--
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- Name: books; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.books (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id character varying(20) NOT NULL,
    title character varying(255) NOT NULL,
    author character varying(255),
    publisher character varying(255),
    isbn character varying(20),
    publication_year integer,
    category_id integer,
    status public.book_status DEFAULT 'available'::public.book_status NOT NULL,
    cover_url text,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT check_book_id_format CHECK (((book_id)::text ~ '^[A-Z]{3}[0-9]{6}$'::text))
);


ALTER TABLE public.books OWNER TO postgres;

--
-- Name: books_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.books_id_seq OWNER TO postgres;

--
-- Name: books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.books_id_seq OWNED BY public.books.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: loan_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loan_items (
    id integer NOT NULL,
    loan_id integer NOT NULL,
    book_id integer NOT NULL,
    returned_at timestamp without time zone,
    return_condition character varying(50),
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.loan_items OWNER TO postgres;

--
-- Name: loan_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loan_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loan_items_id_seq OWNER TO postgres;

--
-- Name: loan_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loan_items_id_seq OWNED BY public.loan_items.id;


--
-- Name: loans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loans (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    loan_id character varying(20) NOT NULL,
    member_uuid uuid NOT NULL,
    loan_date date DEFAULT CURRENT_DATE NOT NULL,
    due_date date NOT NULL,
    status public.loan_status DEFAULT 'active'::public.loan_status NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.loans OWNER TO postgres;

--
-- Name: loans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loans_id_seq OWNER TO postgres;

--
-- Name: loans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loans_id_seq OWNED BY public.loans.id;


--
-- Name: members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.members (
    id integer NOT NULL,
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id character varying(20) NOT NULL,
    name character varying(255) NOT NULL,
    study_program character varying(100),
    join_date date DEFAULT CURRENT_DATE,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    semester integer DEFAULT 1 NOT NULL,
    CONSTRAINT members_semester_check CHECK (((semester >= 1) AND (semester <= 14)))
);


ALTER TABLE public.members OWNER TO postgres;

--
-- Name: members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.members_id_seq OWNER TO postgres;

--
-- Name: members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.members_id_seq OWNED BY public.members.id;


--
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- Name: books id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books ALTER COLUMN id SET DEFAULT nextval('public.books_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: loan_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_items ALTER COLUMN id SET DEFAULT nextval('public.loan_items_id_seq'::regclass);


--
-- Name: loans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans ALTER COLUMN id SET DEFAULT nextval('public.loans_id_seq'::regclass);


--
-- Name: members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members ALTER COLUMN id SET DEFAULT nextval('public.members_id_seq'::regclass);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- Name: admins admins_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_uuid_unique UNIQUE (uuid);


--
-- Name: books books_book_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_book_id_key UNIQUE (book_id);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- Name: books books_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_uuid_unique UNIQUE (uuid);


--
-- Name: categories categories_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_code_key UNIQUE (code);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_uuid_unique UNIQUE (uuid);


--
-- Name: loan_items loan_items_loan_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_items
    ADD CONSTRAINT loan_items_loan_id_key UNIQUE (loan_id);


--
-- Name: loan_items loan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_items
    ADD CONSTRAINT loan_items_pkey PRIMARY KEY (id);


--
-- Name: loans loans_loan_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_loan_id_key UNIQUE (loan_id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (id);


--
-- Name: loans loans_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_uuid_unique UNIQUE (uuid);


--
-- Name: members members_member_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_member_id_key UNIQUE (member_id);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- Name: members members_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_uuid_unique UNIQUE (uuid);


--
-- Name: idx_admins_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admins_username ON public.admins USING btree (username);


--
-- Name: idx_admins_uuid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admins_uuid ON public.admins USING btree (uuid);


--
-- Name: idx_books_book_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_books_book_id ON public.books USING btree (book_id);


--
-- Name: idx_books_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_books_status ON public.books USING btree (status);


--
-- Name: idx_books_title; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_books_title ON public.books USING btree (title);


--
-- Name: idx_books_uuid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_books_uuid ON public.books USING btree (uuid);


--
-- Name: idx_categories_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_code ON public.categories USING btree (code);


--
-- Name: idx_categories_uuid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_uuid ON public.categories USING btree (uuid);


--
-- Name: idx_loan_items_book; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loan_items_book ON public.loan_items USING btree (book_id);


--
-- Name: idx_loan_items_loan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loan_items_loan ON public.loan_items USING btree (loan_id);


--
-- Name: idx_loans_loan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loans_loan_id ON public.loans USING btree (loan_id);


--
-- Name: idx_loans_member; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loans_member ON public.loans USING btree (member_uuid);


--
-- Name: idx_loans_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loans_status ON public.loans USING btree (status);


--
-- Name: idx_loans_uuid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loans_uuid ON public.loans USING btree (uuid);


--
-- Name: idx_members_member_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_member_id ON public.members USING btree (member_id);


--
-- Name: idx_members_uuid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_members_uuid ON public.members USING btree (uuid);


--
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: books update_books_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: loans update_loans_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: members update_members_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: books books_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: loan_items loan_items_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_items
    ADD CONSTRAINT loan_items_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;


--
-- Name: loan_items loan_items_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loan_items
    ADD CONSTRAINT loan_items_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE CASCADE;


--
-- Name: loans loans_member_uuid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_member_uuid_fkey FOREIGN KEY (member_uuid) REFERENCES public.members(uuid) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

